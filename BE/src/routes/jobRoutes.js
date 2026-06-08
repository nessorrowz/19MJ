const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

const requireAuth = protect;

// Public-ish or candidate routes
router.get('/', requireAuth, jobController.getAllJobs); // Assuming candidates must be logged in to see/apply
router.get('/candidate/applications', requireAuth, jobController.getCandidateApplications);
router.post('/:jobId/apply', requireAuth, jobController.applyToJob);

// Company routes
router.post('/', requireAuth, jobController.createJob);
router.get('/company', requireAuth, jobController.getCompanyJobs);
router.get('/company/applications/recent', requireAuth, jobController.getCompanyRecentApplications);
router.get('/:jobId/applications', requireAuth, jobController.getJobApplications);
router.put('/:jobId', requireAuth, jobController.updateJob);
router.put('/:jobId/close', requireAuth, jobController.closeJob);

module.exports = router;
