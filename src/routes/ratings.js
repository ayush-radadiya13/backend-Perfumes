const express = require('express');
const ratingController = require('../controllers/ratingController');
const { protect, adminOnly } = require('../middleware/auth');
const { add } = require('../validators/ratingValidator');

const router = express.Router();

router.get('/product/:productId', ratingController.getByProduct);
router.post('/', protect, add, ratingController.add);

router.get('/admin', protect, adminOnly, ratingController.getAllAdmin);

module.exports = router;
