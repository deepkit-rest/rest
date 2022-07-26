import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { http, HttpKernel, HttpModule, HttpRequest } from "@deepkit/http";
import { Database } from "@deepkit/orm";
import { CoreModule } from "src/core/core.module";
import { RequestContext } from "src/core/request-context";
import { DatabaseExtensionModule } from "src/database-extension/database-extension.module";
import { JwtModule } from "src/jwt/jwt.module";
import { User } from "src/user/user.entity";

import { AuthGuard } from "./auth.guard";
import { AuthListener } from "./auth.listener";
import { AuthModule } from "./auth.module";
import { AuthCaptchaService } from "./auth-captcha.service";
import { AuthTokenService } from "./auth-token.service";

describe("Auth", () => {
  let app: App<any>;

  describe("Guard & Listener", () => {
    beforeEach(() => {
      app = new App({
        imports: [new HttpModule()],
        providers: [
          AuthGuard,
          {
            provide: AuthTokenService,
            useValue: Object.create(AuthTokenService.prototype),
          },
          { provide: RequestContext, scope: "http" },
        ],
        listeners: [AuthListener],
      });
    });

    it("should allow valid requests for protected routes", async () => {
      @http.controller()
      class TestingController {
        constructor(private context: RequestContext) {}
        @http.GET().group("auth-required")
        handle(): void {
          expect(this.context.user).toBe("user");
        }
      }
      app.appModule.addController(TestingController);
      jest
        .spyOn(AuthTokenService.prototype, "decodeAndVerify")
        .mockReturnValueOnce(
          Promise.resolve({ type: "access", user: "user" as any }),
        );
      const kernel = app.get(HttpKernel);
      const response = await kernel.request(
        HttpRequest.GET("/").header("authorization", "Bearer token"),
      );
      expect(response.statusCode).toBe(200);
    });

    it("should forbid anonymous requests for protected routes", async () => {
      @http.controller()
      class TestingController {
        @http.GET().group("auth-required")
        handle(): void {}
      }
      app.appModule.addController(TestingController);
      const kernel = app.get(HttpKernel);
      const response = await kernel.request(HttpRequest.GET("/"));
      expect(response.statusCode).toBe(401);
    });

    it("should do nothing for non-protected routes", async () => {
      @http.controller()
      class TestingController {
        @http.GET()
        handle(): void {}
      }
      app.appModule.addController(TestingController);
      const kernel = app.get(HttpKernel);
      const response = await kernel.request(HttpRequest.GET("/"));
      expect(response.statusCode).toBe(200);
    });
  });

  describe("API", () => {
    let facade: TestingFacade<App<any>>;
    let database: Database;

    beforeEach(async () => {
      facade = createTestingApp({
        imports: [
          new CoreModule(),
          new DatabaseExtensionModule(),
          new JwtModule({ secret: "secret" }),
          new AuthModule(),
        ],
      });
      database = facade.app.get(Database);
      await database.migrate();
      await facade.startServer();
    });

    describe("POST /auth/captcha", () => {
      test("response", async () => {
        const response = await facade.request(
          HttpRequest.POST("/api/auth/captcha"),
        );
        expect(response.statusCode).toBe(200);
        expect(response.json).toEqual({
          key: expect.any(String),
          svg: expect.stringMatching(/<svg .*><\/svg>/u),
        });
      });
    });

    describe("POST /auth/register", () => {
      test("response", async () => {
        const spy = jest
          .spyOn(AuthCaptchaService.prototype, "verify")
          .mockReturnValue();
        const response = await facade.request(
          HttpRequest.POST("/api/auth/register").json({
            name: "name",
            email: "email@email.com",
            password: "password",
            captchaKey: "key",
            captchaResult: "result",
          }),
        );
        expect(spy).toHaveBeenCalled();
        expect(response.statusCode).toBe(200);
        const user = await database.query(User).findOne();
        const { id, name, email } = user;
        const createdAt = user.createdAt.toISOString();
        expect(response.json).toEqual({
          user: { id, name, email, createdAt, verifiedAt: null },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });
      });
    });
  });
});
