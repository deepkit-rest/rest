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
