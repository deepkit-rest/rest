import { eventDispatcher } from "@deepkit/event";
import { createTestingApp } from "@deepkit/framework";
import {
  HtmlResponse,
  http,
  HttpRequest,
  httpWorkflow,
  RouteConfig,
} from "@deepkit/http";

import {
  HttpAccessDeniedResponse,
  HttpActionMeta,
  HttpControllerMeta,
  HttpInjectorContext,
  HttpRouteConfig,
} from "./http-common";
import { HttpExtensionModule } from "./http-extension.module";

describe("Http Extension", () => {
  test("additional providers", async () => {
    let assertion!: () => void;
    @http.controller().group("group")
    class MyController {
      constructor(
        private injector: HttpInjectorContext,
        private routeConfig: HttpRouteConfig,
        private actionMeta: HttpActionMeta,
        private controllerMeta: HttpControllerMeta,
      ) {}
      @http.GET()
      route() {
        assertion = () => {
          expect(this.injector.scope?.name).toBe("http");
          expect(this.routeConfig).toBeInstanceOf(RouteConfig);
          expect(this.actionMeta).toMatchObject({ methodName: "route" });
          expect(this.controllerMeta).toMatchObject({ groups: ["group"] });
        };
      }
    }
    const facade = createTestingApp({
      imports: [new HttpExtensionModule()],
      controllers: [MyController],
    });
    await facade.startServer();
    const response = await facade.request(HttpRequest.GET("/"));
    expect(response.statusCode).toBe(200);
    assertion();
  });

  test("custom response for access denied", async () => {
    let code: number | undefined;
    @http.controller()
    class MyController {
      @http.GET()
      action() {}
    }
    class MyListener {
      @eventDispatcher.listen(httpWorkflow.onController)
      onController(event: typeof httpWorkflow.onController.event) {
        if (code)
          event.injectorContext.set(
            HttpAccessDeniedResponse,
            new HtmlResponse("", code),
          );
        event.accessDenied();
      }
    }
    const facade = createTestingApp({
      imports: [new HttpExtensionModule()],
      controllers: [MyController],
      listeners: [MyListener],
    });
    await facade.startServer();
    {
      code = undefined;
      const response = await facade.request(HttpRequest.GET("/"));
      expect(response.statusCode).toBe(403);
    }
    {
      code = 401;
      const response = await facade.request(HttpRequest.GET("/"));
      expect(response.statusCode).toBe(code);
    }
  });

  test("base url", async () => {
    @http.controller()
    class MyController {
      @http.GET()
      route() {}
    }
    const facade = createTestingApp({
      imports: [new HttpExtensionModule({ baseUrl: "api" })],
      controllers: [MyController],
    });
    await facade.startServer();
    const response = await facade.request(HttpRequest.GET("/api"));
    expect(response.statusCode).toBe(200);
  });
});
