import { HttpRequest } from "@deepkit/http";
import { ValidationError } from "@deepkit/type";
import { HttpRequestParser } from "src/common/http-request-parser.service";

import { RestActionHandler, RestActionHandlerContext } from "./rest.interfaces";
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest.meta";
import { RestActionHandlerResolver } from "./rest-action-handler-resolver.service";

describe("RestActionHandlerResolver", () => {
  let requestParser: HttpRequestParser;
  let resolver: RestActionHandlerResolver;

  beforeEach(() => {
    requestParser = { parseUrl: jest.fn(), parseBody: jest.fn() };
    resolver = new RestActionHandlerResolver(requestParser);
  });

  describe("resolve", () => {
    it("should work", async () => {
      class Handler implements RestActionHandler {
        handle(context: RestActionHandlerContext) {
          return context;
        }
      }
      const request: HttpRequest = { body: undefined, url: "/" } as any;
      const resourceMeta: RestResourceMetaValidated = {} as any;
      const actionMeta: RestActionMetaValidated = {} as any;
      jest
        .mocked(requestParser.parseUrl)
        .mockReturnValue({ path: "/", queries: { key1: "v1" } });
      jest
        .mocked(requestParser.parseBody)
        .mockReturnValue(Promise.resolve({ key2: "v2" }));
      const result = resolver.resolve(
        new Handler(),
        request,
        resourceMeta,
        actionMeta,
      );
      const context: RestActionHandlerContext = await result();
      expect(context).toEqual({
        request,
        resourceMeta,
        actionMeta,
        parseBody: expect.any(Function),
        parseQueries: expect.any(Function),
      });
      expect(() => context.parseQueries()).toThrow("No type received");
      expect(() => context.parseBody()).toThrow("No type received");
      expect(context.parseQueries<{ key1: string }>()).toEqual({ key1: "v1" });
      expect(context.parseBody<{ key2: string }>()).toEqual({ key2: "v2" });
      class Model {}
      expect(context.parseQueries<Model>()).toBeInstanceOf(Model);
      expect(context.parseBody<Model>()).toBeInstanceOf(Model);
      expect(() => {
        context.parseQueries<{ key1: number }>();
      }).toThrow(ValidationError);
      expect(() => {
        context.parseBody<{ key2: number }>();
      }).toThrow(ValidationError);
    });
  });
});
