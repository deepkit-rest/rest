import {
  BaseResponse,
  HtmlResponse,
  HttpAction,
  HttpController,
  RouteConfig,
} from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";

export class NoContentResponse extends HtmlResponse {
  constructor() {
    super("", 204);
  }
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

// Dependency Injection Tokens

export class HttpInjectorContext extends InjectorContext {}
export class HttpRouteConfig extends RouteConfig {}
export class HttpControllerMeta extends HttpController {}
export class HttpActionMeta extends HttpAction {}
export class HttpAccessDeniedResponse extends BaseResponse {}
