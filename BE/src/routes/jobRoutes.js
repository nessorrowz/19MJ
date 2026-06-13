const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

const requireAuth = protect;

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/applications/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Public-ish or candidate routes
router.get('/', requireAuth, jobController.getAllJobs); // Assuming candidates must be logged in to see/apply
router.get('/candidate/applications', requireAuth, jobController.getCandidateApplications);
router.post('/transcribe-temp', requireAuth, upload.single('video'), jobController.transcribeTempVideo);
router.post('/:jobId/apply', requireAuth, upload.any(), jobController.applyToJob);
router.post('/:jobId/view', requireAuth, jobController.incrementJobView);

// Company routes
router.post('/', requireAuth, jobController.createJob);
router.get('/company', requireAuth, jobController.getCompanyJobs);
router.get('/company/applications/recent', requireAuth, jobController.getCompanyRecentApplications);
router.get('/:jobId/applications', requireAuth, jobController.getJobApplications);
router.patch('/applications/:appId/status', requireAuth, jobController.updateApplicationStatus);
router.get('/:jobId/scouting', requireAuth, jobController.scoutCandidates);
router.put('/:jobId', requireAuth, jobController.updateJob);
router.put('/:jobId/close', requireAuth, jobController.closeJob);

module.exports = router;
