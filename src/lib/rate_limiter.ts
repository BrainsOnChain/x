export class RateLimiter {
  /**
   * Returns a promise that resolves after the specified delay
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executes an array of tasks with a delay between each one
   */
  static async executeWithDelay<T>(
    tasks: (() => Promise<T>)[],
    delayMs: number,
    onTaskComplete?: (result: T, index: number) => void
  ): Promise<T[]> {
    const results: T[] = [];

    for (const [index, task] of tasks.entries()) {
      // Execute the task
      const result = await task();
      results.push(result);

      // Notify of completion if callback provided
      if (onTaskComplete) {
        onTaskComplete(result, index);
      }

      // Add delay if this isn't the last task
      if (index < tasks.length - 1) {
        await this.delay(delayMs);
      }
    }

    return results;
  }
}
