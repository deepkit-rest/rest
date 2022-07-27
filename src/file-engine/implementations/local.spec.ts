import { existsSync, readFileSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { Readable } from "stream";
import * as uuid from "uuid";

import { LocalFileEngine, LocalFileEngineOptions } from "./local";

describe("LocalFileEngine", () => {
  describe("bootstrapping", () => {
    it("should work", async () => {
      const bootstrap = async (options: LocalFileEngineOptions) =>
        new LocalFileEngine(options).bootstrap();
      await expect(bootstrap({ root: "not-exists" })).rejects.toThrow();
      await expect(bootstrap({ root: "data" })).resolves.toBeUndefined();
    });
  });

  describe("bootstrapped", () => {
    let root: string;
    let engine: LocalFileEngine;

    beforeEach(async () => {
      root = `test-${uuid.v4()}`;
      await mkdir(root);
      engine = new LocalFileEngine({ root });
      await engine.bootstrap();
    });

    afterEach(async () => {
      await rm(root, { recursive: true });
    });

    describe("store", () => {
      it("should work", async () => {
        const ref = await engine.store(Readable.from([Buffer.from("hello")]));
        expect(existsSync(`${root}/${ref}`)).toBe(true);
        expect(readFileSync(`${root}/${ref}`).toString()).toBe("hello");
      });
    });

    describe("fetch", () => {
      it.each`
        start        | end          | expected
        ${undefined} | ${undefined} | ${"hello"}
        ${0}         | ${Infinity}  | ${"hello"}
        ${1}         | ${3}         | ${"ell"}
      `(
        "should work when key exists (start: $start, end: $end)",
        async ({ start, end, expected }) => {
          await writeFile(`${root}/key`, "hello");
          const stream = await engine.fetch("key", { start, end });
          expect(stream.read().toString()).toBe(expected);
        },
      );

      it("should fail when key not found", async () => {
        await expect(engine.fetch("key")).rejects.toThrow();
      });
    });

    describe("remove", () => {
      it("should work when target exists", async () => {
        await writeFile(`${root}/key`, "hello");
        await engine.remove("key");
        expect(existsSync(`${root}/key`)).toBe(false);
      });

      it("should fail when target not found", async () => {
        await expect(engine.remove("key")).rejects.toThrow();
      });
    });
  });
});
