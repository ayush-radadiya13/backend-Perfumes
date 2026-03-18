const { body } = require('express-validator');

exports.add = [
  body('product').isMongoId().withMessage('Valid product ID required'),
  body('stars').isInt({ min: 1, max: 5 }).withMessage('Stars 1-5'),
  body('review').optional().isString().isLength({ max: 2000 }),
];
