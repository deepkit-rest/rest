import {
  createHttpError,
  HtmlResponse,
  HttpAction,
  httpClass,
  RouteConfig,
} from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";

export class NoContentResponse extends HtmlResponse {
  constructor() {
    super("", 204);
  }
}

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

export class HttpInjectorContext extends InjectorContext {}

export class HttpRouteConfig extends RouteConfig {}

export class HttpControllerMeta {}
export interface HttpControllerMeta extends HttpControllerMetadata {}
type HttpControllerMetadata = NonNullable<ReturnType<typeof httpClass._fetch>>;

export class HttpActionMeta extends HttpAction {}
