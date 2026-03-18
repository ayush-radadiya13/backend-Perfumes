const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', protect, adminOnly, dashboardController.stats);
router.get('/analytics/graph', protect, adminOnly, dashboardController.salesGraph);
router.get('/analytics/top-products', protect, adminOnly, dashboardController.topProducts);
router.get('/analytics/monthly-sales', protect, adminOnly, dashboardController.monthlySales);
router.get('/customers', protect, adminOnly, dashboardController.customers);

module.exports = router;
