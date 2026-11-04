export class SingleFlight<T> {
  private active: Promise<T> | null = null;
  run(fn: () => Promise<T>): Promise<T> {
    if (this.active) return this.active;
    this.active = fn().finally(() => {
      this.active = null;
    });
    return this.active;
  }
}
