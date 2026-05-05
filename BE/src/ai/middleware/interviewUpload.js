//Middleware upload media interview.
const multer = require('multer');
const interviewRepository = require('../repositories/interviewRepository');
const { buildInterviewMediaPath } = require('../storage/mediaStorage');

const ALLOWED_MEDIA_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
]);

const getMaxInterviewVideoBytes = () => {
  const maxMb = Number(process.env.MAX_INTERVIEW_VIDEO_MB || 200);
  return Math.max(1, maxMb) * 1024 * 1024;
};

const storage = multer.diskStorage({
  destination(req, file, callback) {
    try {
      callback(null, buildInterviewMediaPath({
        sessionId: req.params.id,
        originalName: file.originalname,
      }).replace(/[\\/][^\\/]+$/, ''));
    } catch (error) {
      callback(error);
    }
  },
  filename(req, file, callback) {
    try {
      const fullPath = buildInterviewMediaPath({
        sessionId: req.params.id,
        originalName: file.originalname,
      });
      callback(null, fullPath.split(/[\\/]/).pop());
    } catch (error) {
      callback(error);
    }
  },
});

//Validasi mime type sebelum file diterima.
const fileFilter = (req, file, callback) => {
  if (!ALLOWED_MEDIA_TYPES.has(file.mimetype)) {
    return callback(new Error('Tipe media interview tidak didukung.'));
  }

  return callback(null, true);
};

const uploadInterviewMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: getMaxInterviewVideoBytes(),
  },
}).single('media');

//Pastikan sesi milik kandidat sebelum multer menulis file.
const verifyInterviewSessionOwnership = async (req, res, next) => {
  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'ID sesi interview tidak valid.' });
  }

  try {
    const session = await interviewRepository.getSessionByIdForUser(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Sesi interview tidak ditemukan.' });
    }

    req.interviewSession = session;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Gagal memverifikasi sesi interview.' });
  }
};

//Wrapper agar error upload dikembalikan sebagai JSON.
const handleInterviewMediaUpload = (req, res, next) => {
  uploadInterviewMedia(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Ukuran media interview melebihi batas.' });
    }

    return res.status(400).json({ message: error.message || 'Upload media interview gagal.' });
  });
};

module.exports = {
  ALLOWED_MEDIA_TYPES,
  getMaxInterviewVideoBytes,
  verifyInterviewSessionOwnership,
  handleInterviewMediaUpload,
};
