import { createHttpError, HtmlResponse, httpClass } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";

export class HttpInjectorContext extends InjectorContext {}

export class NoContentResponse extends HtmlResponse {
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

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

export { HttpAction as HttpRouteMeta } from "@deepkit/http";
export type HttpControllerMeta = NonNullable<
  ReturnType<typeof httpClass._fetch>
>;
