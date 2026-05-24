//Service orchestration sesi interview dan transkripsi.
const interviewRepository = require('../repositories/interviewRepository');
const { createLlmGateway } = require('../llm/llmGateway');
const { AiServiceError } = require('./cvReviewService');

const defaultDependencies = {
  interviewRepository,
  createLlmGateway,
  fetch: global.fetch,
};

const getSttServiceUrl = () => process.env.AI_STT_SERVICE_URL || 'http://localhost:8001';

const getSttRequestHeaders = () => ({
  'Content-Type': 'application/json',
  ...(process.env.AI_SERVICE_TOKEN ? { 'X-19MJ-AI-Token': process.env.AI_SERVICE_TOKEN } : {}),
});

//Buat sesi interview baru.
const createInterviewSession = async ({
  userId,
  questionText,
  dependencies = defaultDependencies,
}) => {
  if (!userId) {
    throw new AiServiceError(401, 'User belum terautentikasi.');
  }

  return dependencies.interviewRepository.createSession({
    userId,
    questionText,
    metadata: { source: 'candidate_practice' },
  });
};

//Simpan metadata media upload untuk sesi milik user.
const saveInterviewMedia = async ({
  userId,
  sessionId,
  file,
  dependencies = defaultDependencies,
}) => {
  if (!file) {
    throw new AiServiceError(400, 'File media wajib dikirim dengan field media.');
  }

  const session = await dependencies.interviewRepository.getSessionByIdForUser(sessionId, userId);
  if (!session) {
    throw new AiServiceError(404, 'Sesi interview tidak ditemukan.');
  }

  return dependencies.interviewRepository.saveMedia(sessionId, userId, {
    mediaPath: file.path,
    mediaMimeType: file.mimetype,
    mediaSizeBytes: file.size,
  });
};

//Ambil sesi interview dengan transkrip terbaru jika ada.
const getInterviewSession = async ({
  userId,
  sessionId,
  dependencies = defaultDependencies,
}) => {
  const session = await dependencies.interviewRepository.getSessionByIdForUser(sessionId, userId);
  if (!session) {
    return null;
  }

  const transcript = await dependencies.interviewRepository.getTranscriptBySessionId(session.id);
  const evaluation = await dependencies.interviewRepository.getEvaluationBySessionId(session.id, userId);

  if (transcript && evaluation && evaluation.result_json) {
    transcript.metadata_json = {
      ...(transcript.metadata_json || {}),
      strengths: evaluation.result_json.strengths || [],
      improvements: evaluation.result_json.improvements || [],
      suggestedAnswer: evaluation.result_json.suggestedAnswer || "",
      overallScore: evaluation.overall_score,
      communicationScore: evaluation.communication_score,
      relevanceScore: evaluation.relevance_score,
      structureScore: evaluation.structure_score,
    };
  }

  return { 
    ...session, 
    overall_score: evaluation ? evaluation.overall_score : null,
    transcript, 
    evaluation 
  };
};

//Update edited transcript dengan ownership sesi kandidat.
const updateInterviewTranscript = async ({
  userId,
  sessionId,
  editedTranscript,
  dependencies = defaultDependencies,
}) => {
  const session = await dependencies.interviewRepository.getSessionByIdForUser(sessionId, userId);
  if (!session) {
    throw new AiServiceError(404, 'Sesi interview tidak ditemukan.');
  }

  const transcript = await dependencies.interviewRepository.getTranscriptBySessionId(session.id);
  if (!transcript) {
    const manualTranscript = await dependencies.interviewRepository.createTranscript({
      interviewSessionId: session.id,
      rawTranscript: editedTranscript,
      editedTranscript,
      segments: [],
      metadata: { source: 'manual_input' },
    });

    await dependencies.interviewRepository.updateSessionStatus(session.id, userId, {
      status: 'transcribed',
      errorMessage: null,
    });

    return { session, transcript: manualTranscript };
  }

  const updatedTranscript = await dependencies.interviewRepository.updateTranscript({
    interviewSessionId: session.id,
    editedTranscript,
  });

  return { session, transcript: updatedTranscript };
};

//Kirim media ke service STT dan simpan transkrip.
const transcribeInterviewSession = async ({
  userId,
  sessionId,
  language,
  dependencies = defaultDependencies,
}) => {
  const session = await dependencies.interviewRepository.getSessionByIdForUser(sessionId, userId);
  if (!session) {
    throw new AiServiceError(404, 'Sesi interview tidak ditemukan.');
  }

  if (!session.media_path) {
    throw new AiServiceError(400, 'Media interview belum diupload.');
  }

  await dependencies.interviewRepository.updateSessionStatus(sessionId, userId, { status: 'transcribing' });

  try {
    const response = await dependencies.fetch(`${getSttServiceUrl()}/transcribe`, {
      method: 'POST',
      headers: getSttRequestHeaders(),
      body: JSON.stringify({ 
        audio_path: session.media_path,
        language: language || undefined
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.detail?.message || 'Service STT gagal memproses media.');
    }

    const transcript = await dependencies.interviewRepository.createTranscript({
      interviewSessionId: session.id,
      rawTranscript: payload.transcript || '',
      segments: payload.segments || [],
      metadata: { sttStatus: payload.status, model: payload.model || null },
    });
    const updatedSession = await dependencies.interviewRepository.updateSessionStatus(sessionId, userId, {
      status: 'transcribed',
      errorMessage: null,
    });

    return { session: updatedSession, transcript };
  } catch (error) {
    await dependencies.interviewRepository.updateSessionStatus(sessionId, userId, {
      status: 'failed',
      errorMessage: error.message,
    });
    throw new AiServiceError(503, 'Service transkripsi sedang tidak tersedia.', { cause: error.message });
  }
};

// Ambil daftar semua sesi interview milik kandidat.
const getInterviewSessionsList = async ({ userId, dependencies = defaultDependencies }) => {
  if (!userId) {
    throw new AiServiceError(401, 'User belum terautentikasi.');
  }

  return dependencies.interviewRepository.getAllSessionsForUser(userId);
};

// Hasilkan satu pertanyaan interview dengan model AI berdasarkan target role dan level pengalaman.
const generateInterviewQuestion = async ({ targetRole, level, dependencies = defaultDependencies }) => {
  if (!targetRole || !level) {
    throw new AiServiceError(400, 'Target role dan level pengalaman wajib diisi.');
  }

  const prompt = [
    'Anda adalah interviewer profesional untuk platform 19MJ.',
    `Hasilkan satu (1) pertanyaan interview teknis atau behavioral yang sangat relevan untuk target role: "${targetRole}" dengan level pengalaman: "${level}".`,
    'Pertanyaan harus menantang, mendalam, dan relevan dengan industri modern.',
    'Kembalikan Teks pertanyaan langsung tanpa markdown, penjelasan, atau label tambahan.',
  ].join('\n');

  try {
    const gateway = dependencies.createLlmGateway();
    const result = await gateway.generateText({ prompt });
    return result.text ? result.text.trim() : 'Ceritakan tentang pengalaman proyek backend terbaik Anda.';
  } catch (error) {
    throw new AiServiceError(503, 'Gagal menjana pertanyaan interview dari model AI.', { cause: error.message });
  }
};

module.exports = {
  createInterviewSession,
  getInterviewSession,
  saveInterviewMedia,
  updateInterviewTranscript,
  transcribeInterviewSession,
  getInterviewSessionsList,
  generateInterviewQuestion,
  getSttRequestHeaders,
};


