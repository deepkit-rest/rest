import { HttpRequest } from "@deepkit/http";
import { ReceiveType } from "@deepkit/type";
import { purify } from "src/common/type";

import { HttpRouteConfig } from "./http-common";
import { HttpRequestParser } from "./http-request-parser.service";

export class HttpRequestParsed {
  private requestBody?: Record<string, unknown>;
  private requestQueries?: Record<string, unknown>;
  private requestPathParams?: Record<string, unknown>;

  constructor(
    private request: HttpRequest,
    private requestParser: HttpRequestParser,
    private routeConfig: HttpRouteConfig,
  ) {}

  async loadBody(): Promise<void> {
    if (this.requestBody) return;
    this.requestBody = await this.requestParser.parseBody(this.request);
  }

  getBody<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    if (!this.requestBody) throw new Error("Request body is not loaded");
    return type ? purify<T>(this.requestBody, type) : (this.requestBody as T);
  }

  getQueries<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    if (!this.requestQueries) {
      const [, queries] = this.requestParser.parseUrl(this.request.getUrl());
      this.requestQueries = queries;
    }
    return type
      ? purify<T>(this.requestQueries, type)
      : (this.requestQueries as T);
  }

  getPathParams<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    if (!this.requestPathParams) {
      const [path] = this.requestParser.parseUrl(this.request.getUrl());
      const pathSchema = this.routeConfig.getFullPath();
      const parameters = this.requestParser.parsePath(pathSchema, path);
      this.requestPathParams = parameters;
    }
    return type
      ? purify<T>(this.requestPathParams, type)
      : (this.requestPathParams as T);
  }
}
