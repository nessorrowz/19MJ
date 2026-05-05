const Groq = require('groq-sdk');

// Lazy init: baru dibuat saat ada request, agar tidak crash saat startup
let _groq = null;
const getGroq = () => {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'ISI_API_KEY_GROQ_KAMU') {
      throw new Error('GROQ_API_KEY belum diisi di file BE/.env');
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
};

// ── POST /api/ai/cv-review ────────────────────────────────────────────────────
// Body: { cvText: string, targetRole?: string }
const cvReview = async (req, res) => {
  try {
    const { cvText, targetRole = 'Software Engineer' } = req.body;

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'CV text terlalu pendek atau kosong.',
      });
    }

    const prompt = `
You are an expert career consultant and professional CV reviewer.
Analyze the following CV and provide structured, actionable feedback.

Target Role: ${targetRole}

CV Content:
"""
${cvText.slice(0, 6000)}
"""

Provide your analysis in the following JSON format exactly:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "sections": {
    "contact": { "score": <0-100>, "feedback": "<feedback>" },
    "experience": { "score": <0-100>, "feedback": "<feedback>" },
    "education": { "score": <0-100>, "feedback": "<feedback>" },
    "skills": { "score": <0-100>, "feedback": "<feedback>" }
  },
  "keywords": ["<relevant keyword 1>", "<keyword 2>", "<keyword 3>"],
  "recommendations": "<1-2 sentence priority action>"
}

Respond ONLY with the JSON object, no extra text.
`;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content || '{}';

    // Parse JSON dari response
    let reviewData;
    try {
      // Ambil JSON dari dalam response (jaga-jaga ada teks di luar)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      reviewData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      reviewData = { raw, summary: 'Tidak dapat memparse hasil review.' };
    }

    return res.json({ success: true, data: reviewData });

  } catch (err) {
    console.error('[AI] cv-review error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'AI service error.',
    });
  }
};

// ── POST /api/ai/career-advice ────────────────────────────────────────────────
// Body: { currentRole: string, targetRole: string, skills: string[] }
const careerAdvice = async (req, res) => {
  try {
    const { currentRole, targetRole, skills = [] } = req.body;

    if (!targetRole) {
      return res.status(400).json({ success: false, message: 'Target role wajib diisi.' });
    }

    const prompt = `
You are an expert career advisor.
Create a personalized career development plan.

Current Role: ${currentRole || 'Fresh Graduate'}
Target Role: ${targetRole}
Current Skills: ${skills.join(', ') || 'Not specified'}

Provide your response in JSON format:
{
  "roadmap": [
    { "phase": "Phase 1 (0-3 months)", "focus": "<focus area>", "actions": ["<action 1>", "<action 2>"] },
    { "phase": "Phase 2 (3-6 months)", "focus": "<focus area>", "actions": ["<action 1>", "<action 2>"] },
    { "phase": "Phase 3 (6-12 months)", "focus": "<focus area>", "actions": ["<action 1>", "<action 2>"] }
  ],
  "skillGaps": ["<skill to learn 1>", "<skill 2>", "<skill 3>"],
  "resources": ["<resource/course 1>", "<resource 2>"],
  "estimatedTime": "<estimated time to transition>",
  "tips": "<motivational tip>"
}

Respond ONLY with the JSON object.
`;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let data;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      data = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      data = { raw };
    }

    return res.json({ success: true, data });

  } catch (err) {
    console.error('[AI] career-advice error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { cvReview, careerAdvice };
