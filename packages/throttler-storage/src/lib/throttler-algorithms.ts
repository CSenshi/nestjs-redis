import { FixedWindowAlgorithm } from './algorithms/fixed-window.algorithm.js';
import { LeakyBucketPolicingAlgorithm } from './algorithms/leaky-bucket-policing.algorithm.js';
import { LeakyBucketShapingAlgorithm } from './algorithms/leaky-bucket-shaping.algorithm.js';
import { SlidingWindowCounterAlgorithm } from './algorithms/sliding-window-counter.algorithm.js';
import { SlidingWindowLogAlgorithm } from './algorithms/sliding-window-log.algorithm.js';
import { TokenBucketAlgorithm } from './algorithms/token-bucket.algorithm.js';
import type { IThrottlerAlgorithm } from './throttler-algorithm.interface.js';

export const ThrottlerAlgorithm = {
  FixedWindow: FixedWindowAlgorithm,
  SlidingWindowLog: SlidingWindowLogAlgorithm,
  SlidingWindowCounter: SlidingWindowCounterAlgorithm,
  TokenBucket: TokenBucketAlgorithm,
  LeakyBucketPolicing: LeakyBucketPolicingAlgorithm,
  LeakyBucketShaping: LeakyBucketShapingAlgorithm,
} as const satisfies Record<string, IThrottlerAlgorithm>;
