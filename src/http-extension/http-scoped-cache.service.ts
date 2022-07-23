export class HttpScopedCache {
  storage = new Map<unknown, unknown>();

  set(key: unknown, value: unknown): void {
    this.storage.set(key, value);
  }

  get<T>(key: unknown): T | null {
    const value = this.storage.get(key);
    return (value as T) ?? null;
  }

  getOrThrow<T>(key: unknown): T {
    const value = this.storage.get(key);
    if (!value) throw new Error(`Cache miss for ${key}`);
    return value as T;
  }

  getOrCreate<T>(key: unknown, factory: () => T): T {
    const cached = this.get<T>(key);
    if (cached) return cached;
    const value = factory();
    this.storage.set(key, value);
    return value;
  }

  async getOrCreateAsync<T>(
    key: unknown,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) return cached;
    const value = await factory();
    this.storage.set(key, value);
    return value;
  }
}
