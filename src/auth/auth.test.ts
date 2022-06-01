import { App } from "@deepkit/app";
import { http, HttpKernel, HttpModule, HttpRequest } from "@deepkit/http";
import { entities } from "src/core/entities";
import { RequestContext } from "src/core/request-context";
import { DatabaseModule } from "src/database/database.module";
import { DatabaseInitializer } from "src/database/database-initializer.service";
import { JwtModule } from "src/jwt/jwt.module";
import { User } from "src/user/user.entity";

import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthListener } from "./auth.listener";
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
        @http.GET().group("protected")
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
        @http.GET().group("protected")
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

  describe("Controller", () => {
    describe("register", () => {
      it("should work", async () => {
        app = new App({
          imports: [
            new HttpModule(),
            new DatabaseModule({ url: ":memory:" }).withEntities(...entities),
            new JwtModule({ secret: "secret" }),
          ],
          controllers: [AuthController],
          providers: [AuthTokenService],
        });

        const database = await app
          .get(DatabaseInitializer, DatabaseModule)
          .initialize();
        await database.migrate();
        await database.query(User).find();

        const response = await app.get(HttpKernel).request(
          HttpRequest.POST("/auth/register").json({
            name: "name",
            email: "email@email.com",
            password: "password",
          }),
        );
        expect(response.statusCode).toBe(200);
        const user = await database.query(User).findOne();
        const { id, name, email } = user;
        const createdAt = user.createdAt.toISOString();
        const userResponse = { id, name, email, createdAt, files: [] };
        expect(response.json["user"]).toEqual(userResponse);
        expect(response.json).toHaveProperty("accessToken");
        expect(response.json).toHaveProperty("refreshToken");
      });
    });
  });
});
