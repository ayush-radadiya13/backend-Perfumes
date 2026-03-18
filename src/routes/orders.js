const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');
const { placeOrder } = require('../validators/orderValidator');

const router = express.Router();

router.post('/', protect, placeOrder, orderController.placeOrder);
router.get('/my', protect, orderController.myOrders);

router.get('/admin', protect, adminOnly, orderController.allOrdersAdmin);
router.patch('/admin/:id', protect, adminOnly, orderController.updateStatus);

module.exports = router;
