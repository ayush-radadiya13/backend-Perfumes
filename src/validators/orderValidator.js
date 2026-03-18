const { body } = require('express-validator');

exports.placeOrder = [
  body('items').isArray({ min: 1 }).withMessage('Items array required'),
  body('items.*.productId').optional().isMongoId(),
  body('items.*.product').optional().isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity at least 1'),
  body('shippingAddress').optional().isObject(),
];
