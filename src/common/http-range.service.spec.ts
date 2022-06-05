import { HttpRangeNotSatisfiableError } from "./http";
import { HttpRangeService } from "./http-range.service";

describe("HttpRangeService", () => {
  let service: HttpRangeService;

  beforeEach(() => {
    service = new HttpRangeService();
  });

  describe("parse", () => {
    it.each`
      input              | max          | expected
      ${"bytes=1-2"}     | ${undefined} | ${[[1, 2]]}
      ${"bytes=1-2"}     | ${3}         | ${[[1, 2]]}
      ${"bytes=1-2,4-6"} | ${undefined} | ${[[1, 2], [4, 6]]}
      ${"bytes=1-"}      | ${undefined} | ${[[1, Infinity]]}
    `(
      "should work with input: $input; max: $max",
      async ({ input, max, expected }) => {
        expect(service.parse(input, max)).toEqual(expected);
      },
    );

    it.each`
      input          | max
      ${"bytes=1-2"} | ${1}
      ${"bytes=2-1"} | ${undefined}
      ${"bytes=1"}   | ${undefined}
      ${"bytes=-1"}  | ${undefined}
    `("should fail with input: $input; max: $max", async ({ input, max }) => {
      const fn = () => service.parse(input, max);
      expect(fn).toThrow(HttpRangeNotSatisfiableError);
    });
  });
});
