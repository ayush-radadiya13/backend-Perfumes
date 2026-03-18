const express = require('express');
const offerController = require('../controllers/offerController');
const { protect, adminOnly } = require('../middleware/auth');
const { body } = require('express-validator');

const router = express.Router();

router.get('/admin', protect, adminOnly, offerController.getAllAdmin);
router.get('/', offerController.getAll);
router.get('/:id', offerController.getOne);

router.post(
  '/',
  protect,
  adminOnly,
  [
    body('product').isMongoId(),
    body('discountPercent').optional().isFloat({ min: 0, max: 100 }),
    body('salePrice').optional().isFloat({ min: 0 }),
    body('label').optional().trim(),
  ],
  offerController.create
);
router.patch('/:id', protect, adminOnly, offerController.update);
router.delete('/:id', protect, adminOnly, offerController.remove);

module.exports = router;
