import { HttpScopedCache } from "./http-scoped-cache.service";

describe("HttpScopedCache", () => {
  let cache: HttpScopedCache;

  beforeEach(() => {
    cache = new HttpScopedCache();
  });

  test("basic", async () => {
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);

    expect(cache.getOrThrow("a")).toBe(1);
    expect(() => cache.getOrThrow("b")).toThrow();

    cache.getOrCreate("a", () => 2);
    expect(cache.get("a")).toBe(1);
    cache.getOrCreate("b", () => 2);
    expect(cache.get("b")).toBe(2);

    expect(cache.getOrCreateAsync("a", async () => 2)).resolves.toBe(1);
    expect(cache.getOrCreateAsync("c", async () => 3)).resolves.toBe(3);
  });
});
