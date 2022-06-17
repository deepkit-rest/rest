import { ClassType } from "@deepkit/core";
import { HttpRequest } from "@deepkit/http";
import {
  deserialize,
  metaAnnotation,
  ReflectionClass,
  ReflectionParameter,
  Type,
  validate,
  ValidationError,
} from "@deepkit/type";
import { HttpRequestParser } from "src/common/http-request-parser.service";

import {
  ResolvedRestActionHandler,
  RestActionHandler,
} from "./rest.interfaces";

export class RestActionHandlerResolver {
  constructor(private requestParser: HttpRequestParser) {}

  resolve(
    handler: RestActionHandler,
    request: HttpRequest,
  ): ResolvedRestActionHandler {
    const classSchema = ReflectionClass.from(handler.constructor as ClassType);
    const paramSchemas = classSchema.getMethodParameters(handler.handle.name);
    return async () => {
      await this.prepareRequest(request);
      const params = this.resolveParameters(paramSchemas, request);
      return handler.handle(...params);
    };
  }

  private resolveParameters(
    schemas: ReflectionParameter[],
    request: HttpRequest,
  ): unknown[] {
    const { queries } = this.requestParser.parseUrl(request.url || "/");

    const paramValues: unknown[] = [];
    for (const schema of schemas) {
      const is = (metaName: string) =>
        metaAnnotation.getForName(schema.type, metaName) !== undefined;
      const raw = is("httpBody")
        ? request.body
        : is("httpQueries")
        ? queries
        : null;
      if (!raw) throw new Error(`Unsupported parameter type of ${schema.name}`);
      const value = this.processParameter(raw, schema.type);
      paramValues.push(value);
    }

    return paramValues;
  }

  private processParameter(raw: unknown, type: Type): unknown {
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
