const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createLlmGateway } = require('./src/ai/llm/llmGateway');

async function run() {
  try {
    const res = await pool.query('SELECT id, job_id, candidate_id, cv_url FROM applications ORDER BY created_at DESC LIMIT 1');
    const row = res.rows[0];
    if(!row) return console.log('No app');
    
    const jobRes = await pool.query('SELECT title, description FROM jobs WHERE id = $1', [row.job_id]);
    const jobTitle = jobRes.rows[0].title;
    
    const cvPath = path.join(__dirname, 'uploads/applications', path.basename(row.cv_url));
    const dataBuffer = fs.readFileSync(cvPath);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text.substring(0, 3000);
    
    const prompt = `Anda adalah sistem ATS AI canggih di platform 19MJ. Evaluasi CV pelamar untuk posisi "${jobTitle}".
Teks CV Pelamar:
"""
${pdfText}
"""

Berdasarkan teks CV di atas, buatlah analisis objektif dan realistis dalam format JSON dengan struktur:
{
  "ai_match_score": <number>,
  "strengths": ["kekuatan 1", "kekuatan 2"],
  "weaknesses": ["kelemahan 1"],
  "coreSkills": ["skill 1"],
  "missingKeywords": ["keyword 1"],
  "strengthsCandidate": ["alasan 1"],
  "concerns": ["kekhawatiran 1"]
}
HANYA KEMBALIKAN STRING JSON YANG VALID, TANPA FORMAT MARKDOWN ATAU TEKS LAIN.`;

    const llm = createLlmGateway();
    const response = await llm.generateText({ prompt, responseMimeType: 'application/json' });
    
    let analysisStr = response.text.trim();
    if (analysisStr.startsWith('\`\`\`json')) analysisStr = analysisStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const analysis = JSON.parse(analysisStr);
    
    await pool.query('UPDATE applications SET ai_match_score = $1, ai_analysis = $2 WHERE id = $3', [analysis.ai_match_score, JSON.stringify(analysis), row.id]);
    console.log('DONE!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
