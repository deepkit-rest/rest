import { HttpRangeNotSatisfiableError } from "./http";

export class HttpRangeParser {
  /**
   * Parse a HTTP `Range` header
   *
   * Input:
   * ```
   * <unit>=<start>-<end>(, <start>-<end>...)
   * ```
   *
   * @param input
   * @param maxBytes
   */
  parse(input: string, maxBytes?: number): HttpParsedRange[] {
    const regexp = /^(?<unit>\w+)=(?<ranges>.+)$/u;
    const regexpMatchGroups = input.match(regexp)?.groups;
    if (!regexpMatchGroups) throw new HttpRangeNotSatisfiableError();
    const unit = regexpMatchGroups["unit"];
    const raw = regexpMatchGroups["ranges"];
    const ranges = raw
      .split(",")
      .map((raw) => this.parseRange(raw, unit, maxBytes));
    return ranges;
  }

  private parseRange(
    input: string,
    unit: string,
    max?: number,
  ): HttpParsedRange {
    const regexp = /(?<start>\d+)-(?<end>\d*)/u;
    const regexpMatchGroups = input.match(regexp)?.groups;
    if (!regexpMatchGroups) throw new HttpRangeNotSatisfiableError();

    const start = this.toBytes(+regexpMatchGroups["start"], unit);
    const end = regexpMatchGroups["end"]
      ? this.toBytes(+regexpMatchGroups["end"], unit)
      : Infinity;

    if (start > end) throw new HttpRangeNotSatisfiableError();
    if (max && end > max) throw new HttpRangeNotSatisfiableError();

    return [start, end];
  }

  private toBytes(size: number, unit: string): number {
    switch (unit) {
      case "bytes":
        return size;
      default:
        throw new HttpRangeNotSatisfiableError();
    }
  }
}

export type HttpParsedRange = [start: number, end: number];
