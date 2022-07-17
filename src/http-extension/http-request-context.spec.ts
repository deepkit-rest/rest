import { HttpRequest } from "@deepkit/http";
import { ValidationError } from "@deepkit/type";

import { HttpRequestContext } from "./http-request-context.service";
import { HttpRequestParser } from "./http-request-parser.service";

describe("HttpRequestContext", () => {
  let context: HttpRequestContext;
  let parser: HttpRequestParser;

  function setup(body = {}, queries = {}, path = "/", pathSchema = "/") {
    const request = HttpRequest.POST(path).json(body).query(queries).build();
    const routeConfig: any = { getFullPath: () => pathSchema };
    parser = new HttpRequestParser();
    context = new HttpRequestContext(request, parser, routeConfig);
  }

  describe("loadBody, getBody", () => {
    beforeEach(() => {
      setup({ a: 1 });
    });

    test("basic", async () => {
      await context.loadBody();
      expect(context.getBody()).toEqual({ a: 1 });
    });

    test("cache", async () => {
      jest.spyOn(parser, "parseBody");
      await context.loadBody();
      await context.loadBody();
      expect(parser.parseBody).toHaveBeenCalledTimes(1);
      context.getBody();
      context.getBody();
      expect(parser.parseBody).toHaveBeenCalledTimes(1);
    });

    test("type", async () => {
      await context.loadBody();
      expect(context.getBody<{ a: string }>()).toEqual({ a: "1" });
      expect(() => context.getBody<{ b: number }>()).toThrow(ValidationError);
    });
  });

  describe("getQueries", () => {
    beforeEach(() => {
      setup(undefined, { a: 1 });
    });

    test("basic", () => {
      expect(context.getQueries()).toEqual({ a: "1" });
    });

    test("cache", () => {
      jest.spyOn(parser, "parseUrl");
      context.getQueries();
      context.getQueries();
      expect(parser.parseUrl).toHaveBeenCalledTimes(1);
    });

    test("type", () => {
      expect(context.getQueries<{ a: string }>()).toEqual({ a: "1" });
      const err = ValidationError;
      expect(() => context.getQueries<{ b: number }>()).toThrow(err);
    });
  });

  describe("getPathParams", () => {
    beforeEach(() => {
      setup(undefined, undefined, "/a/1/c/2", "/a/:b/c/:d");
    });

    test("basic", async () => {
      expect(context.getPathParams()).toEqual({ b: "1", d: "2" });
    });

    test("cache", async () => {
      jest.spyOn(parser, "parseUrl");
      context.getPathParams();
      context.getPathParams();
      expect(parser.parseUrl).toHaveBeenCalledTimes(1);
    });

    test("type", async () => {
      expect(context.getPathParams<{ b: number }>()).toEqual({ b: 1 });
      const fn = () => context.getPathParams<{ c: string }>();
      expect(fn).toThrow(ValidationError);
    });
  });
});
