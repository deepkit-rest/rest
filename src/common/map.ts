export class ExpirableMap<Key, Value> extends Map<Key, Value> {
  private expirers = new Map<Key, NodeJS.Timeout>();

  constructor(private expiration: number, private maximum?: number) {
    super();
  }

  override set(key: Key, value: Value): this {
    if (this.maximum && this.size >= this.maximum)
      throw new Error("Too many items");
    const expirer = setTimeout(() => this.delete(key), this.expiration);
    expirer.unref();
    this.expirers.set(key, expirer);
    return super.set(key, value);
  }

  override delete(key: Key): boolean {
    const expirer = this.expirers.get(key);
    if (expirer) {
      clearTimeout(expirer);
      this.expirers.delete(key);
    }
    return super.delete(key);
  }
}
