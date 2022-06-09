import { Engine, EngineManager, EngineRegistry } from "./engine";

describe("Engine", () => {
  describe("EngineManager", () => {
    let manager: EngineManager;

    beforeEach(() => {
      manager = new EngineManager();
    });

    describe("register", () => {
      it("should work", () => {
        const mapSetSpy = jest.spyOn(EngineRegistry.prototype, "set");
        class TestEngine {}
        manager.register("test", TestEngine as any);
        expect(mapSetSpy).toHaveBeenCalledWith("test", TestEngine);
      });
    });

    describe("registerAll", () => {
      it("should work", () => {
        const mapSetSpy = jest.spyOn(EngineRegistry.prototype, "set");
        class TestEngine {}
        manager.registerAll({ test: TestEngine as any });
        expect(mapSetSpy).toHaveBeenCalledWith("test", TestEngine);
      });
    });

    describe("instantiate", () => {
      it("should work", () => {
        class TestingEngine implements Engine<{ key: string }> {
          constructor(public options: { key: string }) {}
          async bootstrap(): Promise<void> {}
        }
        jest
          .spyOn(EngineRegistry.prototype, "get")
          .mockReturnValue(TestingEngine);
        const instance = manager.instantiate("test", `{ "key": "value" }`);
        expect(instance).toBeInstanceOf(TestingEngine);
        expect(instance.options).toEqual({ key: "value" });
      });

      it("should fail when target engine not registered", () => {
        jest.spyOn(EngineRegistry.prototype, "get").mockReturnValue(undefined);
        expect(() => manager.instantiate("test", "{}")).toThrow("not found");
      });

      it("should fail when options are invalid", () => {
        class TestingEngine implements Engine<{ key: string }> {
          constructor(public options: { key: string }) {}
          async bootstrap(): Promise<void> {}
        }
        jest
          .spyOn(EngineRegistry.prototype, "get")
          .mockReturnValue(TestingEngine);
        expect(() => {
          manager.instantiate("test", "{}");
        }).toThrow("options invalid");
      });
    });
  });
});
