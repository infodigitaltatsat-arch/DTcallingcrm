const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const callController = require('../controllers/callController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname || '.wav'));
  }
});

const upload = multer({ storage });

router.use(authenticateToken);
router.get('/', callController.getCallLogs);
router.get('/reports', callController.getCallReports);
router.get('/:id', callController.getCallLogById);
router.post('/', callController.createCallLog);
router.put('/:id/notes', callController.updateCallNotes);
router.post('/:id/recording', upload.single('audio'), callController.uploadRecording);
router.delete('/:id', callController.deleteCallLog);

module.exports = router;
