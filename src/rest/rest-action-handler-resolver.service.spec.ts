import { HttpBody, HttpQueries, HttpRequest } from "@deepkit/http";
import { ValidationError } from "@deepkit/type";
import { HttpRequestParser } from "src/common/http-request-parser.service";

import { RestActionHandler } from "./rest.interfaces";
import { RestActionHandlerResolver } from "./rest-action-handler-resolver.service";

describe("RestActionHandlerResolver", () => {
  let requestParser: HttpRequestParser;
  let resolver: RestActionHandlerResolver;

  beforeEach(() => {
    requestParser = { parseUrl: jest.fn(), parseBody: jest.fn() };
    resolver = new RestActionHandlerResolver(requestParser);
  });

  describe("resolve", () => {
    it("should work when handler takes no parameters", async () => {
      class Handler implements RestActionHandler {
        handle() {
          return "return";
        }
      }
      const request: HttpRequest = { body: {}, url: "/" } as any;
      jest
        .mocked(requestParser.parseUrl)
        .mockReturnValue({ path: "/", queries: {} });
      const result = resolver.resolve(new Handler(), request);
      expect(await result()).toBe("return");
    });

    it("should resolve handler parameters", async () => {
      class Handler implements RestActionHandler {
        handle(body: HttpBody<any>, queries: HttpQueries<any>) {
          expect(body).toEqual({ key: "value1" });
          expect(queries).toEqual({ key: "value2" });
          return "return";
        }
      }
      const request: HttpRequest = {
        body: { key: "value1" },
        url: "/?key=value2",
      } as any;
      jest
        .mocked(requestParser.parseUrl)
        .mockReturnValue({ path: "/", queries: { key: "value2" } });
      const result = resolver.resolve(new Handler(), request);
      expect(await result()).toBe("return");
    });

    it("should deserialize handler parameters", async () => {
      class Body {}
      class Handler implements RestActionHandler {
        handle(body: HttpBody<Body>) {
          expect(body).toBeInstanceOf(Body);
          return "return";
        }
      }
      const request: HttpRequest = { body: {}, url: "/" } as any;
      jest
        .mocked(requestParser.parseUrl)
        .mockReturnValue({ path: "/", queries: {} });
      const result = resolver.resolve(new Handler(), request);
      expect(await result()).toBe("return");
    });

    it("should validate handler parameters", async () => {
      class Handler implements RestActionHandler {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        handle(body: HttpBody<{ key: number }>) {}
      }
      jest
        .mocked(requestParser.parseUrl)
        .mockReturnValue({ path: "/", queries: {} });

      const request1: HttpRequest = { body: { key: "nan" }, url: "/" } as any;
      const result1 = resolver.resolve(new Handler(), request1);
      await expect(result1()).rejects.toBeInstanceOf(ValidationError);

      const request2: HttpRequest = { body: { key: 1 }, url: "/" } as any;
      const result2 = resolver.resolve(new Handler(), request2);
      await expect(result2()).resolves.toBeUndefined();
    });
  });
});
