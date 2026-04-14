export interface IThrottlerAlgorithm {
  /**
   * The Lua script that implements the rate-limiting algorithm.
   * All scripts must return `[totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked]`.
   */
  readonly script: string;
}
