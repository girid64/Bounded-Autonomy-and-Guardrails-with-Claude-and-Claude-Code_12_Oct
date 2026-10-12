
import { describe, expect, it, vi } from 'vitest';
import {
  ErrorCodes,
  ReviewError,
  formatError,
  isReviewError,
  withRetry,
  withTimeout,
} from '../src/utils/error-handler';

describe('ReviewError', () => {
  it('stores the error code and metadata', () => {
    const error = new ReviewError('Request failed', ErrorCodes.GITHUB_API_ERROR, {
      status: 500,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ReviewError');
    expect(error.code).toBe('GITHUB_API_ERROR');
    expect(error.metadata).toEqual({ status: 500 });
  });

  it('identifies ReviewError instances', () => {
    expect(isReviewError(new ReviewError('Failed', ErrorCodes.UNKNOWN_ERROR))).toBe(true);
    expect(isReviewError(new Error('Failed'))).toBe(false);
  });

  it('formats known and unknown errors', () => {
    expect(formatError(new ReviewError('Failed', ErrorCodes.RATE_LIMITED)))
      .toBe('[RATE_LIMITED] Failed');
    expect(formatError(new Error('Oops'))).toBe('Oops');
    expect(formatError('unexpected')).toBe('unexpected');
  });
});

describe('withRetry', () => {
  it('returns the result when the operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    await expect(withRetry(operation, 3, 0)).resolves.toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries after failure and succeeds', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue('recovered');

    await expect(withRetry(operation, 3, 0)).resolves.toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws ReviewError after all attempts fail', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

    await expect(withRetry(operation, 2, 0)).rejects.toMatchObject({
      name: 'ReviewError',
      code: ErrorCodes.RETRY_EXHAUSTED,
    });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid retry configuration', async () => {
    await expect(withRetry(async () => 'ok', 0, 0))
      .rejects.toThrow(RangeError);
    await expect(withRetry(async () => 'ok', 2, -1))
      .rejects.toThrow(RangeError);
  });
});

describe('withTimeout', () => {
  it('returns the result when the operation finishes in time', async () => {
    await expect(withTimeout(async () => 'done', 1000)).resolves.toBe('done');
  });

  it('rejects when the operation exceeds the timeout', async () => {
    await expect(
      withTimeout(() => new Promise<string>(() => {}), 10, 'Agent took too long'),
    ).rejects.toMatchObject({
      name: 'ReviewError',
      code: ErrorCodes.AGENT_TIMEOUT,
      message: 'Agent took too long',
    });
  });

  it('rejects an invalid timeout value', async () => {
    await expect(withTimeout(async () => 'ok', -1))
      .rejects.toThrow(RangeError);
  });
});
