import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpRequest } from "@deepkit/http";
import { Database } from "@deepkit/orm";
import { CoreModule } from "src/core/core.module";
import { DatabaseExtensionModule } from "src/database-extension/database-extension.module";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { JwtModule } from "src/jwt/jwt.module";
import { RestModule } from "src/rest/rest.module";
import { User } from "src/user/user.entity";

import { AuthModule } from "./auth.module";
import { AuthCaptchaService } from "./auth-captcha.service";

describe("Auth", () => {
  let facade: TestingFacade<App<any>>;
  let database: Database;

  beforeEach(async () => {
    facade = createTestingApp({
      imports: [
        new CoreModule(),
        new HttpExtensionModule(),
        new DatabaseExtensionModule(),
        new RestModule(),
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
