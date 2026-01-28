const { body, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next){
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
  }
  next();
};

const createProductValidators = [
  body('title')
  .isString()
    .trim()
    .notEmpty().withMessage('Product title is required'),
    body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('Description can be at most 500 characters long'),
  body('priceAmount')
  .notEmpty().withMessage('Price Amount is required')
  .bail()
    .isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('priceCurrency')
    .optional()
    .isIn(['USD', 'INR']).withMessage('Currency must be either USD or INR'),
    handleValidationErrors
];



module.exports = { createProductValidators };