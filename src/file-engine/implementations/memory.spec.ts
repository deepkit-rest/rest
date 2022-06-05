import { Readable } from "stream";

import { MemoryFileEngine } from "./memory";

describe("MemoryFileEngine", () => {
  let engine: MemoryFileEngine;

  beforeEach(() => {
    engine = new MemoryFileEngine();
  });

  describe("store", () => {
    it("should work", async () => {
      const mapSetSpy = jest.spyOn(Map.prototype, "set");
      const key = await engine.store(Readable.from([Buffer.from("hello")]));
      expect(mapSetSpy).toHaveBeenCalledTimes(1);
      expect(mapSetSpy.mock.lastCall[0]).toBe(key);
      expect(mapSetSpy.mock.lastCall[1]).toBeInstanceOf(Buffer);
      expect(mapSetSpy.mock.lastCall[1].toString()).toBe("hello");
    });
  });

  describe("retrieve", () => {
    it.each`
      start        | end          | expected
      ${undefined} | ${undefined} | ${"hello"}
      ${0}         | ${Infinity}  | ${"hello"}
      ${1}         | ${3}         | ${"ell"}
    `(
      "should work with start: $start; end: $end",
      async ({ start, end, expected }) => {
        const mapGetSpy = jest
          .spyOn(Map.prototype, "get")
          .mockReturnValue(Buffer.from("hello"));
        const stream = await engine.retrieve("key", { start, end });
        expect(mapGetSpy).toHaveBeenCalledTimes(1);
        expect(mapGetSpy).toHaveBeenCalledWith("key");
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
