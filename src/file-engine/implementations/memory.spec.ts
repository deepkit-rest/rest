import { Readable } from "stream";

import { MemoryFileEngine } from "./memory";

describe("MemoryFileEngine", () => {
  let engine: MemoryFileEngine;

  beforeEach(() => {
    engine = new MemoryFileEngine({});
  });

  describe("store", () => {
    it("should work", async () => {
      const spy = jest.spyOn(MemoryFileEngine.storage, "set");
      const key = await engine.store(Readable.from([Buffer.from("hello")]));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.lastCall[0]).toBe(key);
      expect(spy.mock.lastCall[1]).toBeInstanceOf(Buffer);
      expect(spy.mock.lastCall[1].toString()).toBe("hello");
    });
  });

  describe("fetch", () => {
    it.each`
      start        | end          | expected
      ${undefined} | ${undefined} | ${"hello"}
      ${0}         | ${Infinity}  | ${"hello"}
      ${1}         | ${3}         | ${"ell"}
    `(
      "should work with start: $start; end: $end",
      async ({ start, end, expected }) => {
        const spy = jest
          .spyOn(MemoryFileEngine.storage, "get")
          .mockReturnValue(Buffer.from("hello"));
        const stream = await engine.fetch("key", { start, end });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith("key");
        expect(stream.read().toString()).toBe(expected);
      },
    );
  });

  describe("remove", () => {
    it("should work when target exists", async () => {
      const mapDeleteSpy = jest
        .spyOn(Map.prototype, "delete")
        .mockReturnValue(true);
      await engine.remove("key");
      expect(mapDeleteSpy).toHaveBeenCalledTimes(1);
      expect(mapDeleteSpy).toHaveBeenCalledWith("key");
    });

    it("should fail when target not found", async () => {
      await expect(engine.remove("key")).rejects.toThrow();
    });
  });
});
