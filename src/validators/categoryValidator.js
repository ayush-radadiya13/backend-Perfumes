const { body } = require('express-validator');

exports.create = [
  body('name').trim().notEmpty().withMessage('Name is required'),
];

exports.update = [
  body('name').trim().optional(),
  body('description').optional(),
];
