//Utility normalisasi teks tanpa mengubah makna input user.
//Normalisasi whitespace umum untuk hashing dan budget AI.
const normalizeText = (value) => {
  const text = String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();

  //Jangan ubah isi baris agar bullet, nomor, dan jawaban kandidat tetap bermakna.
  return text.replace(/\n{3,}/g, '\n\n');
};

module.exports = { normalizeText };
