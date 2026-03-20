const { body } = require('express-validator');

exports.register = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password at least 6 characters'),
  body('gender').optional().isIn(['male', 'female']).withMessage('Gender must be male or female'),
];

exports.login = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];
