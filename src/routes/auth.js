const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { register, login } = require('../validators/authValidator');

const router = express.Router();

router.post('/register', register, authController.register);
router.post('/login', login, authController.login);
router.post('/admin/login', login, authController.adminLogin);
router.get('/me', protect, authController.me);

module.exports = router;
