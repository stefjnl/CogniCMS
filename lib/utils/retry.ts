/**
 * Retry Utility
 *
 * Provides exponential backoff retry logic for handling transient failures,
 * particularly network issues like ECONNRESET, ETIMEDOUT, etc.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRYABLE_ERRORS = [
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "EAI_AGAIN",
  "socket hang up",
  "Client network socket disconnected",
];

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Function to execute (can be async)
 * @param options - Retry configuration options
 * @returns Promise resolving to the function's return value
 * @throws The last error if all retry attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = isRetryableError(error, retryableErrors);

      // Don't retry if not retryable or if this was the last attempt
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      console.warn(
        `[RETRY] Attempt ${attempt}/${maxAttempts} failed. ` +
          `Retrying in ${delay}ms... Error: ${getErrorMessage(error)}`
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Check if an error is retryable based on error code or message
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (!error) return false;

  // Check error code
  if (typeof error === "object" && error !== null) {
    const err = error as any;

    if (err.code && retryableErrors.includes(err.code)) {
      return true;
    }

    if (err.errno && retryableErrors.includes(err.errno)) {
      return true;
    }

    // Check nested cause
    if (err.cause && isRetryableError(err.cause, retryableErrors)) {
      return true;
    }
  }

  // Check error message
  const message = getErrorMessage(error).toLowerCase();
  return retryableErrors.some((pattern) =>
    message.includes(pattern.toLowerCase())
  );
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    return err.message || err.msg || String(error);
  }
  return String(error);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a retry wrapper with specific options
 *
 * Useful for creating operation-specific retry configurations
 */
export function createRetryWrapper(options: RetryOptions) {
  return <T>(fn: () => Promise<T>) => withRetry(fn, options);
}
