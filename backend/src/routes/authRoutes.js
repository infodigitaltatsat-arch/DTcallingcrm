const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-admin-audit', authController.verifyAdminAuditPassword);
router.post('/change-admin-audit-password', authController.changeAdminAuditPassword);
router.get('/admin-requests', authController.getAdminRequests);
router.put('/admin-requests/:id', authController.updateAdminRequest);
router.post('/presence', authController.updatePresence);
router.post('/lock-inactive-user', authController.lockInactiveUser);
router.get('/users', authController.getUsers);
router.put('/users/:id/unlock', authController.unlockUser);

module.exports = router;
