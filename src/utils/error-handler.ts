
/**
 * Custom error class for review operations.
 */
export class ReviewError extends Error {
  constructor(
    message: string,
    public code: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ReviewError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error codes for the review system.
 */
export const ErrorCodes = {
  // Configuration errors
  MISSING_API_KEY: 'MISSING_API_KEY',
  MISSING_GITHUB_TOKEN: 'MISSING_GITHUB_TOKEN',
  INVALID_CONFIG: 'INVALID_CONFIG',

  // GitHub errors
  PR_NOT_FOUND: 'PR_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',

  // Agent errors
  AGENT_TIMEOUT: 'AGENT_TIMEOUT',
  AGENT_FAILED: 'AGENT_FAILED',
  STRUCTURED_OUTPUT_FAILED: 'STRUCTURED_OUTPUT_FAILED',

  // General errors
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Retry an asynchronous operation with exponential backoff and jitter.
 *
 * maxRetries is the maximum number of attempts, including the first.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  if (!Number.isInteger(maxRetries) || maxRetries < 1) {
    throw new RangeError('maxRetries must be an integer greater than or equal to 1');
  }

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError('delayMs must be a finite, non-negative number');
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const backoff = delayMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 100;

        await new Promise<void>((resolve) => {
          setTimeout(resolve, backoff + jitter);
        });
      }
    }
  }

  throw new ReviewError(
    `Operation failed after ${maxRetries} attempts: ${formatError(lastError)}`,
    ErrorCodes.RETRY_EXHAUSTED,
    {
      maxRetries,
      lastError: formatError(lastError),
    }
  );
}

/**
 * Execute an asynchronous operation with a timeout.
 *
 * Note: a timeout rejects the wrapper but does not cancel the underlying
 * operation. Use an abort signal if the underlying operation supports it.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError('timeoutMs must be a finite, non-negative number');
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve().then(fn),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new ReviewError(errorMessage, ErrorCodes.AGENT_TIMEOUT, {
              timeoutMs,
            })
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Check whether an error is a ReviewError.
 */
export function isReviewError(error: unknown): error is ReviewError {
  return error instanceof ReviewError;
}

/**
 * Format an error for logging or display.
 */
export function formatError(error: unknown): string {
  if (isReviewError(error)) {
    return `[${error.code}] ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}