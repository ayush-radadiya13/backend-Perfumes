const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/wishlistController');

router.post('/add', protect, ctrl.add);
router.post('/remove', protect, ctrl.remove);
router.get('/:userId', protect, ctrl.getByUserId);
router.delete('/:userId', protect, ctrl.clear);

module.exports = router;
