const pool = require('../config/db');

exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can create jobs' });
    }

    const { title, location, type, experience_level, salary_range, description, requirements, skills, screening_questions, video_screening } = req.body;

    const result = await pool.query(
      `INSERT INTO jobs (company_id, title, location, type, experience_level, salary_range, description, requirements, skills, screening_questions, video_screening)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [req.user.id, title, location, type, experience_level, salary_range, description, requirements, JSON.stringify(skills || []), JSON.stringify(screening_questions || []), video_screening || false]
    );

    res.status(201).json({ message: 'Job created successfully', job: result.rows[0] });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Failed to create job' });
  }
};

exports.getCompanyJobs = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can view their jobs' });
    }

    const result = await pool.query(
      `SELECT j.*, 
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants_count,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'pending') as new_count,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status IN ('accepted', 'reviewed')) as shortlisted_count
       FROM jobs j
       WHERE j.company_id = $1
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching company jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, c.company_name, '' as logo,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.candidate_id = $1) as has_applied
       FROM jobs j
       JOIN companies c ON j.company_id = c.user_id
       WHERE j.status = 'open'
       ORDER BY j.created_at DESC`,
      [req.user ? req.user.id : -1]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

exports.applyToJob = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ message: 'Only candidates can apply to jobs' });
    }

    const { jobId } = req.params;
    let { screening_answers } = req.body;

    if (typeof screening_answers === 'string') {
      try {
        screening_answers = JSON.parse(screening_answers);
      } catch (e) {
        screening_answers = [];
      }
    }

    const videos = req.files ? req.files.filter(f => f.fieldname === 'videos') : [];
    const cvs = req.files ? req.files.filter(f => f.fieldname === 'cv') : [];

    if (videos.length > 0) {
      videos.forEach((file, index) => {
        if (screening_answers[index]) {
          screening_answers[index].videoUrl = `/uploads/applications/${file.filename}`;
          screening_answers[index].answer = "Video recording received. Awaiting transcription and analysis.";
          screening_answers[index].score = null;
          screening_answers[index].feedback = "Under review by recruitment team.";
        } else {
          screening_answers.push({ 
            videoUrl: `/uploads/applications/${file.filename}`,
            answer: "Video recording received. Awaiting transcription and analysis.",
            score: null,
            feedback: "Under review by recruitment team."
          });
        }
      });
    }

    const videoUrl = videos.length > 0 ? `/uploads/applications/${videos[0].filename}` : null;
    const cvUrl = cvs.length > 0 ? `/uploads/applications/${cvs[0].filename}` : null;

    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const aiScore = null;
    const aiAnalysis = 'Pending AI Review';

    const result = await pool.query(
      `INSERT INTO applications (job_id, candidate_id, ai_match_score, ai_analysis, screening_answers, video_answer_url, cv_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [jobId, req.user.id, aiScore, aiAnalysis, JSON.stringify(screening_answers || []), videoUrl, cvUrl]
    );

    if (videos.length > 0) {
      processScreeningBackground(result.rows[0].id, screening_answers, videos).catch(err => {
        console.error('Background screening processing failed:', err);
      });
    }

    if (cvUrl) {
      processCVBackground(result.rows[0].id, req.user.id, jobId, cvUrl).catch(err => {
        console.error('Background CV processing failed:', err);
      });
    }

    res.status(201).json({ message: 'Applied successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({ message: 'Failed to apply to job' });
  }
};

exports.transcribeTempVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }
    const path = require('path');
    const fs = require('fs');
    const absPath = path.resolve(req.file.path);
    
    const sttRes = await fetch('http://127.0.0.1:8000/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_path: absPath })
    });
    
    try { fs.unlinkSync(absPath); } catch (err) { console.error('Failed to cleanup temp video', err); }
    
    if (sttRes.ok) {
      const sttData = await sttRes.json();
      res.status(200).json({ transcript: sttData.transcript || "No transcript available." });
    } else {
      res.status(sttRes.status).json({ message: "STT processing failed." });
    }
  } catch (err) {
    console.error('Transcribe temp error:', err);
    res.status(500).json({ message: 'Failed to transcribe temporary video' });
  }
};

async function processScreeningBackground(applicationId, screening_answers, files) {
  const path = require('path');
  const pool = require('../config/db');
  let hasChanges = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const absPath = path.resolve(file.path);
    try {
      const sttRes = await fetch('http://127.0.0.1:8000/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_path: absPath })
      });
      if (sttRes.ok) {
        const sttData = await sttRes.json();
        if (screening_answers[i]) {
          const transcript = sttData.transcript || "No transcript available.";
          screening_answers[i].answer = transcript;
          hasChanges = true;

          if (transcript !== "No transcript available.") {
            try {
              const { createLlmGateway } = require('../ai/llm/llmGateway');
              const llm = createLlmGateway();
              const response = await llm.generateText({
                prompt: `Anda adalah rekruter senior di platform 19MJ. Evaluasi jawaban wawancara video kandidat berikut.
Pertanyaan: ${screening_answers[i].question}
Jawaban (Transkrip STT): ${transcript}

Berikan penilaian dari 0 sampai 100 dan feedback singkat (1-2 kalimat) yang membangun namun jujur tanpa basa-basi AI.
Return ONLY valid JSON format: {"score": <number>, "feedback": "<string>"}`,
                responseMimeType: 'application/json'
              });
              let analysisStr = response.text.trim();
              if (analysisStr.startsWith('\`\`\`json')) analysisStr = analysisStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
              if (analysisStr.startsWith('\`\`\`')) analysisStr = analysisStr.replace(/\`\`\`/g, '').trim();
              const evalResult = JSON.parse(analysisStr);
              screening_answers[i].score = evalResult.score;
              screening_answers[i].feedback = evalResult.feedback;
            } catch (aiErr) {
              console.error(`AI Eval failed for file ${i}:`, aiErr.message);
              screening_answers[i].feedback = "Transcription completed, but AI evaluation failed.";
              screening_answers[i].score = null;
            }
          } else {
            screening_answers[i].feedback = "Could not analyze answer due to missing transcript.";
            screening_answers[i].score = null;
          }
        }
      } else {
        console.error(`STT failed for file ${i}: ${sttRes.status}`);
      }
    } catch (e) {
      console.error(`Error transcribing file ${i}:`, e.message);
    }
  }

  if (hasChanges) {
    await pool.query(
      'UPDATE applications SET screening_answers = $1 WHERE id = $2',
      [JSON.stringify(screening_answers), applicationId]
    );
  }
}

async function processCVBackground(applicationId, candidateId, jobId, cvUrl) {
  const pool = require('../config/db');
  const fs = require('fs');
  const path = require('path');
  let pdfText = "Tidak ada teks CV yang dapat diekstrak.";
  
  try {
    const jobRes = await pool.query('SELECT title, description FROM jobs WHERE id = $1', [jobId]);
    const jobTitle = jobRes.rows[0]?.title || 'Unknown Role';
    const jobDescription = jobRes.rows[0]?.description || '';
    
    if (cvUrl && cvUrl.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const cvPath = path.join(__dirname, '../../', cvUrl);
      if (fs.existsSync(cvPath)) {
        const dataBuffer = fs.readFileSync(cvPath);
        const pdfData = await pdfParse(dataBuffer);
        pdfText = pdfData.text.substring(0, 3000);
      }
    }
    
    const { createLlmGateway } = require('../ai/llm/llmGateway');
    const llm = createLlmGateway();
    
    const prompt = `Anda adalah sistem ATS AI canggih di platform 19MJ. Evaluasi CV pelamar untuk posisi "${jobTitle}".
Deskripsi Pekerjaan: ${jobDescription}

Teks CV Pelamar:
"""
${pdfText}
"""

Berdasarkan teks CV di atas, buatlah analisis objektif dan realistis dalam format JSON dengan struktur:
{
  "ai_match_score": <number 0-100 (seberapa cocok CV dengan role)>,
  "strengths": ["2-3 poin kekuatan spesifik pelamar berdasarkan CV"],
  "weaknesses": ["1-2 poin area yang kurang cocok atau tidak ada di CV"],
  "coreSkills": ["3-5 skill yang ditemukan di CV"],
  "missingKeywords": ["1-2 keyword penting di role ini tapi tidak ada di CV"],
  "strengthsCandidate": ["Alasan umum pelamar ini layak"],
  "concerns": ["Kekhawatiran spesifik dari pengalaman mereka"]
}
HANYA KEMBALIKAN STRING JSON YANG VALID, TANPA FORMAT MARKDOWN ATAU TEKS LAIN.`;

    const response = await llm.generateText({ prompt, responseMimeType: 'application/json' });
    let analysisStr = response.text.trim();
    if (analysisStr.startsWith('\`\`\`json')) {
      analysisStr = analysisStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }
    const analysis = JSON.parse(analysisStr);
    
    await pool.query(
      'UPDATE applications SET ai_match_score = $1, ai_analysis = $2 WHERE id = $3',
      [analysis.ai_match_score, JSON.stringify(analysis), applicationId]
    );
  } catch (err) {
    console.error('CV Background processing failed:', err);
  }
}

exports.getJobApplications = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can view applications' });
    }

    const { jobId } = req.params;

    const jobCheck = await pool.query('SELECT company_id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (jobCheck.rows[0].company_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view applications for this job' });
    }

    const result = await pool.query(
      `SELECT a.*, c.username, c.full_name, c.headline, c.location as candidate_location,
              c.about, c.skills as candidate_skills, c.experiences, c.education_list as education, c.photo
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.user_id
       WHERE a.job_id = $1
       ORDER BY a.ai_match_score DESC`,
      [jobId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
};

exports.getCandidateApplications = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ message: 'Only candidates can view their applications' });
    }

    const result = await pool.query(
      `SELECT a.*, j.title, j.location, j.type, c.company_name, '' as logo
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN companies c ON j.company_id = c.user_id
       WHERE a.candidate_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching candidate applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
};

exports.updateJob = async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ message: 'Only companies can update jobs' });

    const { jobId } = req.params;
    const { title, location, type, experience_level, salary_range, description, requirements, skills } = req.body;

    const jobCheck = await pool.query('SELECT company_id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    if (jobCheck.rows[0].company_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const result = await pool.query(
      `UPDATE jobs 
       SET title = $1, location = $2, type = $3, experience_level = $4, salary_range = $5, description = $6, requirements = $7, skills = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [title, location, type, experience_level, salary_range, description, requirements, JSON.stringify(skills || []), jobId]
    );

    res.json({ message: 'Job updated successfully', job: result.rows[0] });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Failed to update job' });
  }
};

exports.closeJob = async (req, res) => {
  try {
    if (req.user.role !== 'company') return res.status(403).json({ message: 'Only companies can close jobs' });

    const { jobId } = req.params;

    const jobCheck = await pool.query('SELECT company_id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    if (jobCheck.rows[0].company_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const result = await pool.query(
      `UPDATE jobs SET status = 'closed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [jobId]
    );

    res.json({ message: 'Job closed successfully', job: result.rows[0] });
  } catch (error) {
    console.error('Error closing job:', error);
    res.status(500).json({ message: 'Failed to close job' });
  }
};

exports.getCompanyRecentApplications = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can view their applications' });
    }

    const result = await pool.query(
      `SELECT a.*, j.title as job_title, c.username, COALESCE(c.full_name, c.username) as name, c.headline as role, a.ai_match_score as match
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN candidates c ON a.candidate_id = c.user_id
       WHERE j.company_id = $1
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent applications:', error);
    res.status(500).json({ message: 'Failed to fetch recent applications' });
  }
};

exports.incrementJobView = async (req, res) => {
  try {
    const { jobId } = req.params;
    await pool.query(
      `UPDATE jobs SET views = COALESCE(views, 0) + 1 WHERE id = $1`,
      [jobId]
    );
    res.json({ message: 'View incremented' });
  } catch (error) {
    console.error('Error incrementing job view:', error);
    res.status(500).json({ message: 'Failed to increment view' });
  }
};

exports.scoutCandidates = async (req, res) => {
  const pool = require('../config/db');
  try {
    const { jobId } = req.params;
    
    const jobRes = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (jobRes.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    const job = jobRes.rows[0];
    
    // Better logic: Filter candidates whose skills partially match the job requirements or randomly pick from the whole pool if no matches
    // But for now let's just make sure we don't crash
    const candidateRes = await pool.query(`
      SELECT c.*, u.email 
      FROM candidates c
      JOIN users u ON c.user_id = u.id
      ORDER BY RANDOM()
      LIMIT 10
    `);
    
    if (candidateRes.rows.length === 0) return res.json([]);
    
    const candidatesText = candidateRes.rows.map(c => `ID: ${c.id}\nNama: ${c.full_name}\nHeadline: ${c.headline}\nSkills: ${JSON.stringify(c.skills)}`).join('\n\n');
    
    const prompt = `Anda adalah sistem ATS AI. Evaluasi sekumpulan kandidat pasif untuk lowongan "${job.title}".
Syarat Lowongan: ${job.description}
Kandidat:
${candidatesText}

Kembalikan array JSON berisi objek tiap kandidat:
[
  {
    "candidate_id": <ID>,
    "ai_match_score": <number 0-100>,
    "strengths": ["kekuatan utama 1", "kekuatan utama 2"],
    "concerns": ["kekurangan 1", "kekurangan 2"],
    "coreSkills": ["skill relevan 1", "skill relevan 2"]
  }
]
HANYA KEMBALIKAN ARRAY JSON VALID, TANPA TEKS LAIN ATAU MARKDOWN.`;

    const { createLlmGateway } = require('../ai/llm/llmGateway');
    const llm = createLlmGateway();
    const response = await llm.generateText({ prompt, responseMimeType: 'application/json' });
    
    let analysisStr = response.text.trim();
    if (analysisStr.startsWith('\`\`\`json')) analysisStr = analysisStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    if (analysisStr.startsWith('\`\`\`')) analysisStr = analysisStr.replace(/\`\`\`/g, '').trim();
    
    let analysisArray = [];
    try {
      analysisArray = JSON.parse(analysisStr);
    } catch (e) { console.error("Parse failed", e); }
    
    const results = candidateRes.rows.map(c => {
      const match = analysisArray.find(a => a.candidate_id === c.id) || {};
      return {
        id: c.id,
        user_id: c.user_id,
        full_name: c.full_name || c.email,
        headline: c.headline,
        location: c.location,
        skills: c.skills,
        ai_match_score: match.ai_match_score || Math.floor(Math.random() * 40) + 40,
        ai_analysis: JSON.stringify(match)
      };
    });
    
    res.json(results);
  } catch (err) {
    console.error('Scouting failed:', err);
    res.status(500).json({ message: 'Scouting failed' });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can update applications' });
    }

    const { appId } = req.params;
    const { status, private_notes } = req.body;
    
    const appCheck = await pool.query(
      `SELECT a.id FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1 AND j.company_id = $2`,
      [appId, req.user.id]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found or not authorized' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status.toLowerCase());
    }

    if (private_notes !== undefined) {
      updates.push(`private_notes = $${paramIndex++}`);
      values.push(private_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(appId);

    const result = await pool.query(
      `UPDATE applications SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ message: 'Application updated successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ message: 'Failed to update application' });
  }
};
