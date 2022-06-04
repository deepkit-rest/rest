import { existsSync, readFileSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { Readable } from "stream";
import * as uuid from "uuid";

import { LocalFileEngine } from "./local";

describe("LocalFileEngine", () => {
  describe("bootstrapping", () => {
    it("should work", async () => {
      const engine = new LocalFileEngine();
      await expect(engine.bootstrap({})).rejects.toThrow();
      await expect(engine.bootstrap({ root: "not-exists" })).rejects.toThrow();
      await expect(engine.bootstrap({ root: "data" })).resolves.toBeUndefined();
    });
  });

  describe("bootstrapped", () => {
    let root: string;
    let engine: LocalFileEngine;

    beforeEach(async () => {
      root = `test-${uuid.v4()}`;
      await mkdir(root);
      engine = new LocalFileEngine();
      await engine.bootstrap({ root });
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

    describe("retrieve", () => {
      it("should work when key exists", async () => {
        await writeFile(`${root}/key`, "hello");
        const stream = await engine.retrieve("key");
        expect(stream.read().toString()).toBe("hello");
      });

      it("should fail when key not found", async () => {
        await expect(engine.retrieve("key")).rejects.toThrow();
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