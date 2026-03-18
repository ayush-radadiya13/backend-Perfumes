const { body } = require('express-validator');

exports.create = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('category').isMongoId().withMessage('Valid category ID required'),
];

exports.update = [
  body('name').trim().optional(),
  body('price').isFloat({ min: 0 }).optional(),
  body('category').isMongoId().optional(),
  body('description').optional(),
  body('stock').isInt({ min: 0 }).optional(),
];
