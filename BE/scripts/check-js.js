//Script syntax check untuk file JavaScript backend.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CHECK_DIRS = ['src', 'scripts'];

//Kumpulkan file JS secara rekursif dari folder target.
const collectJsFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJsFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }

  return files;
};

const files = CHECK_DIRS.flatMap((dirName) =>
  collectJsFiles(path.join(ROOT_DIR, dirName))
);

if (files.length === 0) {
  console.error('Tidak ada file JavaScript backend yang bisa dicek.');
  process.exit(1);
}

let failed = false;

for (const file of files) {
  //node --check memvalidasi syntax tanpa mengeksekusi kode aplikasi.
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  if (result.error) {
    failed = true;
    console.error(`${path.relative(ROOT_DIR, file)}: ${result.error.message}`);
    continue;
  }

  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || result.stdout || `${path.relative(ROOT_DIR, file)} gagal dicek.`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check berhasil untuk ${files.length} file JavaScript backend.`);
