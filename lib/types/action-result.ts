/**
 * Canonical result type for server actions and internal services.
 *
 * Use this to standardize success/error handling and keep call sites
 * predictable and type-safe.
 */
export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      code: ActionErrorCode;
      message: string;
      details?: unknown;
    };