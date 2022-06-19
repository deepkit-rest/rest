import { HttpRequest } from "@deepkit/http";
import {
  deserialize,
  ReceiveType,
  validate,
  ValidationError,
} from "@deepkit/type";
import { HttpRequestParser } from "src/common/http-request-parser.service";

import {
  ResolvedRestActionHandler,
  RestActionHandler,
  RestActionHandlerContext,
} from "./rest.interfaces";
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest.meta";

export class RestActionHandlerResolver {
  constructor(private requestParser: HttpRequestParser) {}

  resolve(
    handler: RestActionHandler,
    request: HttpRequest,
    resourceMeta: RestResourceMetaValidated,
    actionMeta: RestActionMetaValidated,
  ): ResolvedRestActionHandler {
    return async () => {
      await this.prepareRequest(request);
      const context = this.buildContext(request, resourceMeta, actionMeta);
      return handler.handle(context);
    };
  }

  private buildContext(
    request: HttpRequest,
    resourceMeta: RestResourceMetaValidated,
    actionMeta: RestActionMetaValidated,
  ): RestActionHandlerContext {
    const { queries } = this.requestParser.parseUrl(request.url || "/");
    return {
      request,
      resourceMeta,
      actionMeta,
      parseBody: <Model>(type?: ReceiveType<Model>) => {
        if (!type) throw new Error("No type received");
        return this.processRequestData<Model>(request.body, type);
      },
      parseQueries: <Model>(type?: ReceiveType<Model>) => {
        if (!type) throw new Error("No type received");
        return this.processRequestData<Model>(queries, type);
      },
    };
  }

  private processRequestData<T>(raw: unknown, type?: ReceiveType<T>): T {
    const value = deserialize(raw, undefined, undefined, undefined, type);
    const errors = validate(value, type);
    if (errors.length) throw new ValidationError(errors);
    return value;
  }

  private async prepareRequest(request: HttpRequest): Promise<void> {
    // request body will not be parsed automatically if HttpBody is not used
    // in the route method
    if (!request.body)
      request.body = await this.requestParser.parseBody(request);
  }
}
