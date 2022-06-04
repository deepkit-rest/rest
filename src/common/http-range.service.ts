import { HttpRangeNotSatisfiableError } from "./http";

export class HttpRangeService {
  /**
   * Parse a HTTP `Range` header
   *
   * Input:
   * ```
   * <unit>=<start>-<end>(, <start>-<end>...)
   * ```
   *
   * For example:
   * ```
   * bytes=1-2
   * bytes=1-2,4-6
   * bytes=1-
   * bytes=-114514
   * ```
   * @param header
   * @param size in bytes
   */
  parse(header: string, size?: number): [number, number][] {
    const { unit, ranges: rawRanges } = header.match(
      /(?<unit>..+)=(?<ranges>.\d*-\d*(?:, ?\d*-\d*)*)/u,
    )?.groups as { unit: string; ranges: string };

    let unitInBit = 0;
    switch (unit) {
      case "bytes":
        unitInBit = 8;
        break;

      default:
        throw new HttpRangeNotSatisfiableError();
    }

    const ranges = rawRanges
      .split(",")
      .map(
        (range) =>
          range.split("-").map((size) => (+size / unitInBit) * 8) as [
            number,
            number,
          ],
      );

    if (size)
      for (const range of ranges)
        if (range[0] > size || range[1] > size)
          throw new HttpRangeNotSatisfiableError();

    return ranges;
  }
}
