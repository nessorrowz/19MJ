//Storage helper aman untuk media interview lokal.
const fs = require('fs');
const path = require('path');

class MediaStorageError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MediaStorageError';
    this.details = details;
  }
}

const getStorageRoot = () => path.resolve(process.env.MEDIA_STORAGE_ROOT || 'storage');

const getInterviewMediaRoot = () => {
  const storageRoot = getStorageRoot();
  const configuredDir = process.env.INTERVIEW_MEDIA_DIR || path.join('storage', 'interviews');
  const mediaRoot = path.resolve(configuredDir);

  assertPathInside(storageRoot, mediaRoot);

  return mediaRoot;
};

//Pastikan path hasil resolve tetap berada di folder induk.
const assertPathInside = (parentPath, childPath) => {
  const relativePath = path.relative(parentPath, childPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new MediaStorageError('Path media tidak aman.', { parentPath, childPath });
  }
};

//Buat folder media per sesi interview.
const ensureInterviewSessionDir = (sessionId) => {
  const numericSessionId = Number(sessionId);

  if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
    throw new MediaStorageError('ID sesi interview tidak valid.', { sessionId });
  }

  const mediaRoot = getInterviewMediaRoot();
  const sessionDir = path.resolve(mediaRoot, String(numericSessionId));
  assertPathInside(mediaRoot, sessionDir);
  fs.mkdirSync(sessionDir, { recursive: true });

  return sessionDir;
};

//Buat path file media aman untuk multer.
const buildInterviewMediaPath = ({ sessionId, originalName }) => {
  const sessionDir = ensureInterviewSessionDir(sessionId);
  const extension = path.extname(originalName || '').toLowerCase();
  const safeExtension = extension && extension.length <= 12 ? extension : '.bin';
  const filePath = path.resolve(sessionDir, `media-${Date.now()}${safeExtension}`);
  assertPathInside(sessionDir, filePath);

  return filePath;
};

module.exports = {
  MediaStorageError,
  assertPathInside,
  buildInterviewMediaPath,
  ensureInterviewSessionDir,
  getInterviewMediaRoot,
  getStorageRoot,
};
