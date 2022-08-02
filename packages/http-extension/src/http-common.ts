import {
  BaseResponse,
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

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

// Dependency Injection Tokens

type HttpControllerMetaType = NonNullable<ReturnType<typeof httpClass._fetch>>;
interface HttpControllerMetadata extends HttpControllerMetaType {}
class HttpControllerMetadata {}

export class HttpInjectorContext extends InjectorContext {}
export class HttpRouteConfig extends RouteConfig {}
export class HttpControllerMeta extends HttpControllerMetadata {}
export class HttpActionMeta extends HttpAction {}
export class HttpAccessDeniedResponse extends BaseResponse {}
