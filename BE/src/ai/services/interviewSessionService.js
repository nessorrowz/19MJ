//Service orchestration sesi interview dan transkripsi.
const interviewRepository = require('../repositories/interviewRepository');
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
    const response = await dependencies.fetch(`${getSttServiceUrl()}/transcribe`, {
      method: 'POST',
      headers: getSttRequestHeaders(),
      body: JSON.stringify({ audio_path: session.media_path }),
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

module.exports = {
  createInterviewSession,
  getInterviewSession,
  saveInterviewMedia,
  updateInterviewTranscript,
  transcribeInterviewSession,
  getSttRequestHeaders,
};
