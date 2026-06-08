const pool = require('../config/db');

exports.createJob = async (req, res) => {
  try {
    // Expected role: company
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can create jobs' });
    }

    const { title, location, type, experience_level, salary_range, description, requirements, skills } = req.body;

    const result = await pool.query(
      `INSERT INTO jobs (company_id, title, location, type, experience_level, salary_range, description, requirements, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, title, location, type, experience_level, salary_range, description, requirements, JSON.stringify(skills || [])]
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

    // Get jobs and count of applicants
    const result = await pool.query(
      `SELECT j.*, 
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants_count
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
    // Anyone can view jobs, but we might want to enrich it with company info
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

    // Check if job exists
    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Simulate AI Match Score for now, between 60 and 99
    const dummyAiScore = Math.floor(Math.random() * 40) + 60;
    const dummyAnalysis = 'Strong match based on required skills and candidate profile.';

    const result = await pool.query(
      `INSERT INTO applications (job_id, candidate_id, ai_match_score, ai_analysis)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (job_id, candidate_id) DO NOTHING
       RETURNING *`,
      [jobId, req.user.id, dummyAiScore, dummyAnalysis]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    res.status(201).json({ message: 'Application submitted successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({ message: 'Failed to apply to job' });
  }
};

exports.getJobApplications = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can view applications' });
    }

    const { jobId } = req.params;

    // Verify ownership
    const jobCheck = await pool.query('SELECT company_id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (jobCheck.rows[0].company_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view applications for this job' });
    }

    // Fetch applications with candidate details
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
