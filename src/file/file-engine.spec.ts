import { uuid } from "@deepkit/type";
import { existsSync, readFileSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { Readable } from "stream";

import { LocalFileEngine } from "./file-engine";

describe("LocalFileEngine", () => {
  describe("constructor", () => {
    it("should throw if root does not exist", () => {
      expect(() => new LocalFileEngine("does-not-exist")).toThrow();
    });
  });

  describe("methods", () => {
    let root: string;
    let engine: LocalFileEngine;

    beforeEach(async () => {
      root = `data/test-${uuid()}`;
      await mkdir(root);
      engine = new LocalFileEngine(root);
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
    });
  });
});
