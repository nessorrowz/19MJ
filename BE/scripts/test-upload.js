const fs = require('fs');
const path = require('path');

try {
  const getStorageRoot = () => path.resolve(process.env.MEDIA_STORAGE_ROOT || 'storage');
  const getInterviewMediaRoot = () => {
    const storageRoot = getStorageRoot();
    const configuredDir = process.env.INTERVIEW_MEDIA_DIR || path.join('storage', 'interviews');
    const mediaRoot = path.resolve(configuredDir);
    
    console.log('storageRoot:', storageRoot);
    console.log('configuredDir:', configuredDir);
    console.log('mediaRoot:', mediaRoot);
    
    // Check assertPathInside
    const relativePath = path.relative(storageRoot, mediaRoot);
    console.log('relativePath:', relativePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Path media tidak aman.');
    }
    return mediaRoot;
  };
  getInterviewMediaRoot();
  console.log('SUCCESS');
} catch (err) {
  console.error('FAILED:', err.message);
}
