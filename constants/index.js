/**
 * Centralized Constants
 * Single source of truth for business logic constants
 */

// Order Statuses
export const ORDER_STATUS = {
  ORDER: 'Order',
  PREPARING: 'Preparing',
  SERVED: 'Served',
  COMPLETED: 'Completed',
};

export const ORDER_STATUSES = Object.values(ORDER_STATUS);

// Payment Statuses
export const PAYMENT_STATUS = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
};

export const PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

// Payment Methods
export const PAYMENT_METHOD = {
  UPI: 'UPI',
  CASH: 'Cash',
  OTHER: 'Other',
};

export const PAYMENT_METHODS = Object.values(PAYMENT_METHOD);

// Food Types
export const FOOD_TYPE = {
  VEG: 'Veg',
  NON_VEG: 'Non-Veg',
  OTHER: 'Other',
};

export const FOOD_TYPES = Object.values(FOOD_TYPE);

// Pagination Limits
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
};

// Query Timeouts
export const TIMEOUTS = {
  DB_QUERY: 10000, // 10 seconds
  API_REQUEST: 30000, // 30 seconds
};

export default {
  ORDER_STATUS,
  ORDER_STATUSES,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
  PAYMENT_METHOD,
  PAYMENT_METHODS,
  FOOD_TYPE,
  FOOD_TYPES,
  PAGINATION,
  TIMEOUTS,
};
