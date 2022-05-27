import { App } from "@deepkit/app";
import { HttpKernel, HttpModule, HttpRequest } from "@deepkit/http";
import { entities } from "src/core/entities";
import { DatabaseModule } from "src/database/database.module";
import { DatabaseInitializer } from "src/database/database-initializer.service";
import { JwtModule } from "src/jwt/jwt.module";
import { User } from "src/user/user.entity";

import { AuthController } from "./auth.controller";
import { AuthTokenService } from "./auth-token.service";

describe("AuthController", () => {
  describe("register", () => {
    it("should work", async () => {
      const app = new App({
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
      expect(response.json["user"]).toEqual({ id, name, email, createdAt });
      expect(response.json).toHaveProperty("accessToken");
      expect(response.json).toHaveProperty("refreshToken");
    });
  });
});
