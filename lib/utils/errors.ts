/**
 * Error Handling Utilities
 *
 * Implements Best Practices #8, #9, #10:
 * - Separate expected vs unexpected errors
 * - Sanitize production error messages
 * - Provide structured error logging
 */

/**
 * Base class for HTTP errors
 * @deprecated Use AppError instead for better categorization
 */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Application Error - for EXPECTED errors
 * These are business logic errors that should be shown to users
 */
export class AppError extends Error {
  public readonly isOperational = true;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly cause?: Error;

  constructor({
    message,
    userMessage,
    statusCode = 400,
    cause,
  }: {
    message: string;
    userMessage?: string;
    statusCode?: number;
    cause?: Error;
  }) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
    this.cause = cause;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - for input validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>
  ) {
    super({
      message: `Validation failed: ${message}`,
      userMessage: message,
      statusCode: 400,
    });
    this.name = "ValidationError";
  }
}

/**
 * Authentication Error - for auth failures
 */
export class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super({
      message,
      userMessage: message,
      statusCode: 401,
    });
    this.name = "AuthError";
  }
}

/**
 * Authorization Error - for permission failures
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super({
      message,
      userMessage: message,
      statusCode: 403,
    });
    this.name = "ForbiddenError";
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super({
      message: `${resource} not found`,
      userMessage: `${resource} not found`,
      statusCode: 404,
    });
    this.name = "NotFoundError";
  }
}

/**
 * Conflict Error - for duplicate resources, etc.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super({
      message,
      userMessage: message,
      statusCode: 409,
    });
    this.name = "ConflictError";
  }
}

/**
 * Type guard to check if error is operational (expected)
 */
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational === true;
}

/**
 * Sanitize error for production - removes sensitive details
 */
export function sanitizeError(error: unknown): {
  message: string;
  digest?: string;
  statusCode: number;
} {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Expected errors - safe to show
  if (isOperationalError(error)) {
    return {
      message: error.userMessage,
      statusCode: error.statusCode,
    };
  }

  // HttpError (legacy)
  if (error instanceof HttpError) {
    return {
      message: isDevelopment ? error.message : "An error occurred",
      statusCode: error.status,
    };
  }

  // Error object
  if (error instanceof Error) {
    const digest = generateErrorDigest(error);
    return {
      message: isDevelopment
        ? error.message
        : "An unexpected error occurred. Please try again later.",
      digest,
      statusCode: 500,
    };
  }

  // Unknown error type
  return {
    message: isDevelopment
      ? String(error)
      : "An unexpected error occurred. Please try again later.",
    statusCode: 500,
  };
}

/**
 * Generate error digest (hash) for error tracking
 */
function generateErrorDigest(error: Error): string {
  const errorInfo = `${error.name}:${error.message}:${
    error.stack?.split("\n")[1] || ""
  }`;
  // Simple hash for error identification
  let hash = 0;
  for (let i = 0; i < errorInfo.length; i++) {
    const char = errorInfo.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

/**
 * Log error with appropriate level
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isOperationalError(error)) {
    // Expected errors - log as warning
    console.warn("[AppError]", {
      name: error.name,
      message: error.message,
      userMessage: error.userMessage,
      statusCode: error.statusCode,
      ...context,
    });
  } else {
    // Unexpected errors - log as error with full details
    console.error("[UnexpectedError]", {
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: isDevelopment ? error.stack : undefined,
              digest:
                error instanceof Error ? generateErrorDigest(error) : undefined,
            }
          : String(error),
      ...context,
    });
  }
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: unknown,
  message: string,
  status = 400
): asserts condition {
  if (!condition) {
    throw new AppError({
      message,
      userMessage: message,
      statusCode: status,
    });
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { context, args: JSON.stringify(args).slice(0, 200) });
      throw error;
    }
  }) as T;
}
