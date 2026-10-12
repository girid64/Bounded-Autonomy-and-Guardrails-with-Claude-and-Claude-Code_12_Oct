
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RATE_LIMITS,
  RateLimiter,
  withRateLimit,
} from '../src/utils/rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the default configuration', () => {
    const limiter = new RateLimiter();

    expect(limiter.canProceed()).toBe(true);
    expect(limiter.getStatus()).toMatchObject({
      activeRequests: 0,
      requestsInWindow: 0,
      tokensInWindow: 0,
      availableRequests: DEFAULT_RATE_LIMITS.maxRequestsPerMinute,
      availableTokens: DEFAULT_RATE_LIMITS.maxTokensPerMinute,
    });
  });

  it('accepts custom rate limits', () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 2,
      maxTokensPerMinute: 500,
      maxConcurrent: 1,
    });

    expect(limiter.canProceed(100)).toBe(true);
    expect(limiter.getStatus().availableRequests).toBe(2);
    expect(limiter.getStatus().availableTokens).toBe(500);
  });

  it('tracks acquired requests and estimated tokens', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 5,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2,
    });

    await limiter.acquire(200);

    expect(limiter.getStatus()).toMatchObject({
      activeRequests: 1,
      requestsInWindow: 1,
      tokensInWindow: 200,
    });

    limiter.release();

    expect(limiter.getStatus().activeRequests).toBe(0);
  });

  it('updates token usage when releasing with actual tokens', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 5,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2,
    });

    await limiter.acquire(200);
    limiter.release(150);

    expect(limiter.getStatus().tokensInWindow).toBe(150);
  });

  it('blocks new requests when the request limit is reached', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 1,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2,
    });

    await limiter.acquire(100);

    expect(limiter.canProceed(100)).toBe(false);
    expect(limiter.getStatus().availableRequests).toBe(0);

    // Avoid waiting for the sliding window to expire.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);

    expect(limiter.canProceed(100)).toBe(true);
  });

  it('releases a slot after a successful rate-limited operation', async () => {
    const limiter = new RateLimiter({ maxConcurrent: 1 });
    const operation = vi.fn().mockResolvedValue('success');

    await expect(withRateLimit(limiter, operation, 100)).resolves.toBe('success');

    expect(operation).toHaveBeenCalledOnce();
    expect(limiter.getStatus().activeRequests).toBe(0);
  });

  it('releases a slot when a rate-limited operation fails', async () => {
    const limiter = new RateLimiter({ maxConcurrent: 1 });
    const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

    await expect(withRateLimit(limiter, operation, 100))
      .rejects.toThrow('Operation failed');

    expect(limiter.getStatus().activeRequests).toBe(0);
  });
});
