import { createTestingApp } from "@deepkit/framework";
import { Readable } from "stream";

import { FileEngine } from "./file-engine.interface";
import { FileEngineModule } from "./file-engine.module";
import { LocalFileEngine } from "./implementations/local";
import { MemoryFileEngine } from "./implementations/memory";

describe("FileEngineModule", () => {
  it.each`
    module                                                                   | type
    ${new FileEngineModule({ name: "local", options: '{ "root": "src" }' })} | ${LocalFileEngine}
    ${new FileEngineModule({ name: "memory" })}                              | ${MemoryFileEngine}
  `("should work", async ({ module, type }) => {
    const facade = createTestingApp({ imports: [module] });
    await facade.startServer();
    expect(facade.app.get(FileEngine)).toBeInstanceOf(type);
  });

  it("should fail when targe engine not exists", async () => {
    await expect(
      createTestingApp({
        imports: [new FileEngineModule({ name: "not-exists" })],
      }).startServer(),
    ).rejects.toThrowError();
  });

  it("should work with additional registry", async () => {
    class TestingFileEngine implements FileEngine {
      async bootstrap(): Promise<void> {}
      async store(): Promise<string> {
        return "";
      }
      async retrieve(): Promise<Readable> {
        return Readable.from(["hello"]);
      }
      async remove(): Promise<void> {}
    }
    const facade = createTestingApp({
      imports: [
        new FileEngineModule(
          { name: "testing", options: '{ "key": "value" }' }, //
        ).withRegistry(
          { testing: TestingFileEngine }, //
        ),
      ],
    });
    const engine = facade.app.get(FileEngine);
    expect(engine).toBeInstanceOf(TestingFileEngine);
    const engineBootstrapSpy = jest.spyOn(engine, "bootstrap");
    expect(engineBootstrapSpy).not.toHaveBeenCalled();
    await facade.startServer();
    expect(engineBootstrapSpy).toHaveBeenCalledWith({ key: "value" });
  });
});
