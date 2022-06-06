import { createTestingApp } from "@deepkit/framework";
import { Readable } from "stream";

import { FileEngine } from "./file-engine.interface";
import { FileEngineModule } from "./file-engine.module";
import { LocalFileEngine } from "./implementations/local";
import { MemoryFileEngine } from "./implementations/memory";

describe("FileEngine", () => {
  class TestingFileEngine implements FileEngine<TestingFileEngineOptions> {
    constructor(public options: TestingFileEngineOptions) {}
    async bootstrap(): Promise<void> {}
    async store(): Promise<string> {
      return "";
    }
    async retrieve(): Promise<Readable> {
      return Readable.from(["hello"]);
    }
    async remove(): Promise<void> {}
  }
  interface TestingFileEngineOptions {
    key: string;
  }

  it.each`
    module                                                                                                                   | type
    ${new FileEngineModule({ name: "local", options: '{ "root": "src" }' })}                                                 | ${LocalFileEngine}
    ${new FileEngineModule({ name: "memory" })}                                                                              | ${MemoryFileEngine}
    ${new FileEngineModule({ name: "testing", options: '{ "key": "value" }' }).withRegistry({ testing: TestingFileEngine })} | ${TestingFileEngine}
  `("should work", async ({ module, type }) => {
    const facade = createTestingApp({ imports: [module] });
    const engine = facade.app.get(FileEngine);
    expect(engine).toBeInstanceOf(type);
    const engineBootstrapSpy = jest.spyOn(engine, "bootstrap");
    expect(engineBootstrapSpy).not.toHaveBeenCalled();
    await facade.startServer();
    expect(engineBootstrapSpy).toHaveBeenCalledWith();
  });

  it.each`
    options             | error
    ${undefined}        | ${"SyntaxError"}
    ${"#&@*$^(@*$^@*#"} | ${"SyntaxError"}
    ${"{}"}             | ${"ValidationError"}
  `(
    "should fail when options are invalid: $options",
    async ({ options, error }) => {
      const facade = createTestingApp({
        imports: [
          new FileEngineModule({ name: "testing", options }).withRegistry({
            testing: TestingFileEngine,
          }),
        ],
      });
      expect(() => facade.app.get(FileEngine)).toThrow(error);
    },
  );

  it("should fail when targe engine not exists", async () => {
    await expect(
      createTestingApp({
        imports: [new FileEngineModule({ name: "not-exists" })],
      }).startServer(),
    ).rejects.toThrowError();
  });
});
