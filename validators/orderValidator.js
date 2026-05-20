import { body, param, validationResult } from 'express-validator';

/**
 * Validation middleware for creating orders
 * Follows SRP by separating validation logic
 */
export const validateCreateOrder = [
  body('userEmail')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('foodName')
    .trim()
    .notEmpty()
    .withMessage('Food name is required'),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  
  body('tableNumber')
    .optional()
    .isInt({ min: 0, max: 40 })
    .withMessage('Table number must be between 0 and 40'),

  // Middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

/**
 * Validation middleware for updating orders
 */
export const validateUpdateOrder = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  
  body('status')
    .optional()
    .isIn(['Order', 'Preparing', 'Served', 'Completed'])
    .withMessage('Status must be one of: Order, Preparing, Served, Completed'),
  
  body('paymentStatus')
    .optional()
    .isIn(['Unpaid', 'Paid'])
    .withMessage('Payment status must be: Unpaid or Paid'),
  
  body('paymentMethod')
    .optional()
    .isIn(['UPI', 'Cash', 'Other'])
    .withMessage('Payment method must be: UPI, Cash, or Other'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    
    // Ensure at least one field is being updated
    if (!req.body.status && !req.body.paymentStatus && !req.body.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (status, paymentStatus, or paymentMethod) must be provided'
      });
    }
    
    next();
  }
];

/**
 * Validation for order ID parameter
 */
export const validateOrderId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }
    next();
  }
];
