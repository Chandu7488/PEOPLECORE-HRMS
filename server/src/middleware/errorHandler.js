import { ENV } from '../config/env.js';

/**
 * Global Error Handler Middleware
 * Conforms to PeopleCore standard API error specification
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  const errorResponse = {
    success: false,
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
      message: err.message || 'An unexpected error occurred',
      details: err.details || [],
    },
  };

  if (ENV.NODE_ENV !== 'production' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};
