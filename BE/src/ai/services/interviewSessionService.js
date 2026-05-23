//Service orchestration sesi interview dan transkripsi.
const interviewRepository = require('../repositories/interviewRepository');
const { logAiEvent } = require('../utils/aiLogger');
const { AiServiceError } = require('./cvReviewService');

const defaultDependencies = {
  interviewRepository,
  fetch: global.fetch,
};

const getSttServiceUrl = () => process.env.AI_STT_SERVICE_URL || 'http://localhost:8001';

const getSttRequestHeaders = () => ({
  'Content-Type': 'application/json',
  ...(process.env.AI_SERVICE_TOKEN ? { 'X-19MJ-AI-Token': process.env.AI_SERVICE_TOKEN } : {}),
});

const normalizeOptionalText = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
};

const normalizeSttLanguage = (language) => {
  const normalized = normalizeOptionalText(language)?.toLowerCase() || process.env.AI_STT_LANGUAGE || 'auto';
  return ['auto', 'id', 'en'].includes(normalized) ? normalized : 'auto';
};

//Buat konteks decoding dari data sesi, bukan kamus statis.
const buildSttContext = ({ questionText, transcriptionContext = null }) => {
  const contextParts = [
    normalizeOptionalText(transcriptionContext),
    questionText ? `Interview question: ${normalizeOptionalText(questionText)}` : null,
  ].filter(Boolean);

  if (!contextParts.length) {
    return null;
  }

  return [
    'Transcribe the interview answer accurately.',
    'Preserve Indonesian and English words as spoken.',
    ...contextParts,
  ].join(' ');
};

//Normalisasi payload STT agar aman disimpan.
const normalizeSttPayload = (payload) => {
  if (!payload || payload.status !== 'completed') {
    throw new Error('Response STT tidak valid.');
  }

  if (typeof payload.transcript !== 'string') {
    throw new Error('Transcript STT tidak valid.');
  }

  return {
    transcript: payload.transcript,
    segments: Array.isArray(payload.segments) ? payload.segments : [],
    metadata: {
      sttStatus: payload.status,
      model: payload.model || null,
      latencyMs: Number.isFinite(payload.latency_ms) ? payload.latency_ms : null,
    },
  };
};

//Panggil service STT internal.
const requestSttTranscription = async ({
  mediaPath,
  language = 'auto',
  contextPrompt = null,
  dependencies,
}) => {
  let response;
  const requestBody = {
    audio_path: mediaPath,
    language,
    ...(contextPrompt ? { context_prompt: contextPrompt, hotwords: contextPrompt } : {}),
  };

  try {
    response = await dependencies.fetch(`${getSttServiceUrl()}/transcribe`, {
      method: 'POST',
      headers: getSttRequestHeaders(),
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    throw new AiServiceError(503, 'Service transkripsi sedang tidak tersedia.', { cause: error.message });
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AiServiceError(503, payload?.detail?.message || 'Service STT gagal memproses media.');
  }

  return normalizeSttPayload(payload);
};

//Buat sesi interview baru.
const createInterviewSession = async ({
  userId,
  questionText,
  transcriptionLanguage = 'auto',
  transcriptionContext = null,
  dependencies = defaultDependencies,
}) => {
  if (!userId) {
    throw new AiServiceError(401, 'User belum terautentikasi.');
  }

  return dependencies.interviewRepository.createSession({
    userId,
    questionText,
    metadata: {
      source: 'candidate_practice',
      transcriptionLanguage: normalizeSttLanguage(transcriptionLanguage),
      transcriptionContext: normalizeOptionalText(transcriptionContext),
    },
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
  return { ...session, transcript };
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
    const sttResult = await requestSttTranscription({
      mediaPath: session.media_path,
      language: normalizeSttLanguage(session.metadata_json?.transcriptionLanguage),
      contextPrompt: buildSttContext({
        questionText: session.question_text,
        transcriptionContext: session.metadata_json?.transcriptionContext,
      }),
      dependencies,
    });

    const transcript = await dependencies.interviewRepository.saveTranscript({
      interviewSessionId: session.id,
      rawTranscript: sttResult.transcript,
      segments: sttResult.segments,
      metadata: sttResult.metadata,
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

    logAiEvent('interview_transcription_failed', {
      feature: 'interview_transcription',
      status: 'failed',
      errorCategory: error instanceof AiServiceError ? 'stt_service' : 'stt_persistence',
    });

    if (error instanceof AiServiceError) {
      throw error;
    }

    throw new AiServiceError(500, 'Transkripsi berhasil, tetapi gagal disimpan.', { cause: error.message });
  }
};

module.exports = {
  createInterviewSession,
  getInterviewSession,
  saveInterviewMedia,
  updateInterviewTranscript,
  transcribeInterviewSession,
  getSttRequestHeaders,
  buildSttContext,
  normalizeSttPayload,
  requestSttTranscription,
};
