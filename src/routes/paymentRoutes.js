const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');

router.post('/dummy/complete', paymentCtrl.dummyPaymentComplete);

module.exports = router;
