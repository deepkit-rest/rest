import { createTestingApp } from "@deepkit/framework";
import { Readable } from "stream";

import { FileEngine } from "./file-engine.interface";
import { FileEngineModule } from "./file-engine.module";

describe("FileEngineModule", () => {
  it("should work", async () => {
    class TestingFileEngine implements FileEngine {
      async bootstrap(): Promise<void> {}
      async store(): Promise<string> {
        return "";
      }
      async retrieve(): Promise<Readable> {
        return Readable.from(["hello"]);
      }
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
