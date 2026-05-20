/**
 * Global Error Handler Middleware
 * Centralized error handling for all routes
 * Implements consistent error responses
 */
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate ${field} already exists`
    });
  }

  // Database connection errors
  if (err.name === 'MongoServerSelectionError' || 
      err.message?.includes('connection') || 
      err.message?.includes('timeout')) {
    return res.status(503).json({
      success: false,
      message: 'Database connection error. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }

  // Default server error
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err.message
    })
  });
};
