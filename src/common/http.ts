import { createHttpError, HtmlResponse } from "@deepkit/http";

export class HtmlNoContentResponse extends HtmlResponse {
  constructor() {
    super("", 204);
  }
}

export class HttpUnauthorizedError extends createHttpError(
  401,
  "Unauthorized",
) {}

export class HttpRangeNotSatisfiableError extends createHttpError(
  416,
  "Range Not Satisfiable",
) {}

export class HttpPartialContent extends createHttpError(
  206,
  "Partial Content",
) {}
