export class ConcurrencyLimiter {
  private running = new Map<string, Promise<unknown>>()

  constructor(
    private maxPerKey = 1,
  ) {}

  async acquire<T>(key: string, task: () => Promise<T>): Promise<T> {
    while (this.running.has(key)) {
      if (this.running.size >= this.maxPerKey) {
        await this.running.get(key)
      } else {
        break
      }
    }

    const promise = task()
    this.running.set(key, promise)

    try {
      return await promise
    } finally {
      this.running.delete(key)
    }
  }

  isRunning(key: string): boolean {
    return this.running.has(key)
  }

  activeCount(): number {
    return this.running.size
  }
}
