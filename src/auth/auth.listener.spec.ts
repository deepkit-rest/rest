import { App } from "@deepkit/app";
import {
  http,
  HttpKernel,
  HttpModule,
  HttpRequest,
  httpWorkflow,
} from "@deepkit/http";

import { AuthListener } from "./auth.listener";
import { AuthTokenService } from "./auth-token.service";

describe("AuthListener", () => {
  let listener: AuthListener;

  describe("onController", () => {
    it("should work with protected routes", async () => {
      const tokenService = {
        decodeAndVerify: jest
          .fn()
          .mockReturnValueOnce(
            Promise.resolve({ type: "access", user: "user" }),
          ),
      } as unknown as AuthTokenService;
      listener = new AuthListener(tokenService);
      const context = {};
      const event = {
        injectorContext: { get: jest.fn().mockReturnValueOnce(context) },
        route: { groups: ["protected"] },
        request: { headers: { authorization: "Bearer valid" } },
        send: jest.fn(),
      } as unknown as typeof httpWorkflow.onController.event;
      await listener.onController(event);
      expect(event.send).not.toHaveBeenCalled();
      expect(context).toEqual({ user: "user" });
    });

    it("should do nothing if route is not protected", async () => {
      listener = new AuthListener({} as any);
      const event = {
        route: { groups: [] },
        get headers() {
          return {};
        },
      };
      const mockEventHeaders = jest.spyOn(event, "headers", "get");
      await listener.onController(event as any);
      expect(mockEventHeaders).not.toHaveBeenCalled();
    });

    it("should refuse the request if the header is invalid", async () => {
      listener = new AuthListener({} as any);
      const event = {
        route: { groups: ["protected"] },
        request: { headers: { authorization: "invalid" } },
        send: jest.fn(),
      } as unknown as typeof httpWorkflow.onController.event;
      await listener.onController(event);
      expect(event.send).toHaveBeenCalled();
    });

    it("should work when integrated", async () => {
      class TestingController {
        @http.GET("1").group("protected")
        route1() {}
        @http.GET("2")
        route2() {}
      }
      const mockTokenService = {
        decodeAndVerify: jest
          .fn()
          .mockReturnValue({ type: "access", user: "user" }),
      };
      const app = new App({
        imports: [new HttpModule()],
        controllers: [TestingController],
        providers: [{ provide: AuthTokenService, useValue: mockTokenService }],
        listeners: [AuthListener],
      });
      const kernel = app.get(HttpKernel);
      const response1 = await kernel.request(HttpRequest.GET("/1"));
      expect(response1.statusCode).toBe(401);
      const response2 = await kernel.request(HttpRequest.GET("/2"));
      expect(response2.statusCode).toBe(200);
    });
  });
});
