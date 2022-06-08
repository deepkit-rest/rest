import { ExpirableMap } from "./map";

jest.useFakeTimers();

describe("Map", () => {
  describe("ExpirableMap", () => {
    let map: ExpirableMap<string, string>;

    const prepare = (...args: ConstructorParameters<typeof ExpirableMap>) =>
      (map = new ExpirableMap(...args));

    describe("set", () => {
      it("should check item maximum", () => {
        prepare(1000, 1);
        map.set("a", "a");
        expect(() => map.set("b", "b")).toThrow();
      });

      it("should expire items", () => {
        prepare(1000, 1);
        map.set("a", "a");
        expect(map.has("a")).toBe(true);
        jest.runAllTimers();
        expect(map.has("a")).toBe(false);
      });
    });

    describe("delete", () => {
      it("should clear expirer", () => {
        prepare(1000, 1);
        jest.spyOn(map, "delete");
        map.set("a", "a");
        map.delete("a");
        jest.runAllTimers();
        expect(map.delete).toHaveBeenCalledTimes(1);
      });
    });
  });
});
