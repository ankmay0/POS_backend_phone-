/**
 * Response Helper Utilities
 * Standardized API response format
 */

import ERROR_CODES from '../constants/errorCodes.js';

/**
 * Success response
 */
export const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Success response with pagination
 */
export const successWithPagination = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
};

/**
 * Error response
 */
export const error = (
  res,
  message = 'An error occurred',
  statusCode = 500,
  errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR,
  details = null
) => {
  const response = {
    success: false,
    message,
    code: errorCode,
  };

  // Only include error details in development
  if (details && process.env.NODE_ENV === 'development') {
    response.error = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 */
export const validationError = (res, message = 'Validation failed', errors = []) => {
  return res.status(400).json({
    success: false,
    message,
    code: ERROR_CODES.VALIDATION_ERROR,
    errors,
  });
};

/**
 * Not found error response
 */
export const notFound = (res, resource = 'Resource', message = null) => {
  return error(
    res,
    message || `${resource} not found`,
    404,
    ERROR_CODES.NOT_FOUND
  );
};

/**
 * Database error response
 */
export const databaseError = (res, err = null) => {
  const isConnectionError = 
    err?.name === 'MongoServerSelectionError' ||
    err?.message?.includes('connection') ||
    err?.message?.includes('timeout');

  if (isConnectionError) {
    return error(
      res,
      'Database connection error. Please try again later.',
      503,
      ERROR_CODES.DB_CONNECTION_ERROR,
      err?.message
    );
  }

  return error(
    res,
    'Database error occurred',
    500,
    ERROR_CODES.DB_QUERY_ERROR,
    err?.message
  );
};

export default {
  success,
  successWithPagination,
  error,
  validationError,
  notFound,
  databaseError,
};
