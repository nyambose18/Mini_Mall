import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw new AppError(400, 'VALIDATION', 'Please check the highlighted fields.', { fields });
  }
  return result.data;
}

export function notFound(message = 'That record could not be found.') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function forbidden(message = 'You do not have access to this record.') {
  return new AppError(403, 'FORBIDDEN', message);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...err.extra },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: 'Please check the submitted values.',
        fields: Object.fromEntries(
          err.issues.map((issue) => [issue.path.join('.') || '_', issue.message]),
        ),
      },
    });
  }

  if (err?.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: 'Some values are not valid.',
        fields: Object.fromEntries(
          Object.entries(err.errors || {}).map(([key, value]) => [key, value.message]),
        ),
      },
    });
  }

  if (err?.name === 'CastError') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'That record could not be found.' },
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      error: { code: 'DUPLICATE', message: 'That value is already in use.' },
    });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: { code: 'FILE_TOO_LARGE', message: 'Images must be 5 MB or smaller.' },
    });
  }

  console.error('[server error]', err);
  return res.status(500).json({
    error: { code: 'SERVER_ERROR', message: 'Something went wrong on the server.' },
  });
}