import { HttpRangeNotSatisfiableError } from "./http-common";
import { HttpRangeParser } from "./http-range-parser.service";

describe("HttpRangeParser", () => {
  let parser: HttpRangeParser;

  beforeEach(() => {
    parser = new HttpRangeParser();
  });

  describe("parseMulti", () => {
    it.each`
      input              | max          | expected
      ${"bytes=1-2"}     | ${undefined} | ${[[1, 2]]}
      ${"bytes=1-2"}     | ${3}         | ${[[1, 2]]}
      ${"bytes=1-2,4-6"} | ${undefined} | ${[[1, 2], [4, 6]]}
      ${"bytes=1-"}      | ${undefined} | ${[[1, Infinity]]}
    `(
      "should work with input: $input; max: $max",
      async ({ input, max, expected }) => {
        expect(parser.parseMulti(input, max)).toEqual(expected);
      },
    );

    it.each`
      input              | max
      ${"bytes=1-2"}     | ${1}
      ${"bytes=__1-2__"} | ${undefined}
      ${"__bytes=1-2__"} | ${undefined}
      ${"bytes=2-1"}     | ${undefined}
      ${"bytes=1"}       | ${undefined}
      ${"bytes=-1"}      | ${undefined}
    `("should fail with input: $input; max: $max", async ({ input, max }) => {
      const fn = () => parser.parseMulti(input, max);
      expect(fn).toThrow(HttpRangeNotSatisfiableError);
    });
  });

  describe("parseSingle", () => {
    it("should work", async () => {
      const range = parser.parseSingle("bytes=1-2");
      expect(range).toEqual([1, 2]);
    });

    it("should fail", async () => {
      expect(() => parser.parseSingle("bytes=1-2,4-6")).toThrow();
    });
  });
});
