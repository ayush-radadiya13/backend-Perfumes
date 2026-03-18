const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect, optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, orderCtrl.createUserOrder);
router.get('/', protect, orderCtrl.listMyOrders);
router.get('/:id', protect, orderCtrl.getMyOrder);

module.exports = router;
