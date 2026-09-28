const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-admin-audit', authenticateToken, authController.verifyAdminAuditPassword);
router.post('/change-admin-audit-password', authenticateToken, authController.changeAdminAuditPassword);
router.get('/admin-requests', authenticateToken, requireAdmin, authController.getAdminRequests);
router.put('/admin-requests/:id', authenticateToken, requireAdmin, authController.updateAdminRequest);
router.post('/presence', authenticateToken, authController.updatePresence);
router.post('/lock-inactive-user', authenticateToken, authController.lockInactiveUser);
router.get('/users', authenticateToken, requireAdmin, authController.getUsers);
router.put('/users/:id/unlock', authenticateToken, requireAdmin, authController.unlockUser);

module.exports = router;
