import { HttpRequest } from "@deepkit/http";
import { ReceiveType } from "@deepkit/type";
import { purify } from "src/common/type";

import { HttpRouteConfig } from "./http-common";
import { HttpRequestParser } from "./http-request-parser.service";
import { HttpScopedCache } from "./http-scoped-cache.service";

export class HttpRequestParsed {
  constructor(
    private request: HttpRequest,
    private requestParser: HttpRequestParser,
    private routeConfig: HttpRouteConfig,
    private cache: HttpScopedCache,
  ) {}

  async getBody<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): Promise<T> {
    const factory = async () => this.requestParser.parseBody(this.request);
    const value = await this.cache.getOrCreateAsync(this.getBody, factory);
    return type ? purify<T>(value, type) : (value as T);
  }

  getQueries<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    const factory = () => this.requestParser.parseUrl(this.request.getUrl())[1];
    const value = this.cache.getOrCreate(this.getQueries, factory);
    return type ? purify<T>(value, type) : (value as T);
  }

  getPathParams<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    const factory = () => {
      const [path] = this.requestParser.parseUrl(this.request.getUrl());
      const pathSchema = this.routeConfig.getFullPath();
      return this.requestParser.parsePath(pathSchema, path);
    };
    const value = this.cache.getOrCreate(this.getPathParams, factory);
    return type ? purify<T>(value, type) : (value as T);
  }
}
