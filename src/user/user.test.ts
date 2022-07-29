import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { Database } from "@deepkit/orm";
import { AuthModule } from "src/auth/auth.module";
import { AuthTokenService } from "src/auth/auth-token.service";
import { ExpirableMap } from "src/common/map";
import { CoreModule } from "src/core/core.module";
import { RequestContext } from "src/core/request-context";
import { DatabaseExtensionModule } from "src/database-extension/database-extension.module";
import { EmailEngine } from "src/email-engine/email-engine.interface";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { JwtModule } from "src/jwt/jwt.module";
import { RestModule } from "src/rest/rest.module";

import { User } from "./user.entity";
import { UserModule } from "./user.module";
import { UserVerificationCodePool } from "./user-verification-code";

describe("User", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;
  let user: User;
  let auth: string;

  beforeEach(async () => {
    facade = createTestingApp({
      imports: [
        new CoreModule(),
        new HttpExtensionModule(),
        new DatabaseExtensionModule(),
        new RestModule({ prefix: "" }),
        new AuthModule(),
        new JwtModule({ secret: "secret" }),
        new UserModule(),
      ],
      providers: [
        {
          provide: RequestContext,
          useFactory: () => ({ user: { id: user.id } }),
          scope: "http",
        },
        { provide: EmailEngine, useValue: { send: jest.fn() } },
      ],
    });
    requester = facade.app.get(HttpKernel);
    database = facade.app.get(Database);
    await database.migrate();
    user = new User({
      name: "test",
      email: "test@test.com",
      password: "password",
    });
    await database.persist(user);
    auth = `Bearer ${await facade.app
      .get(AuthTokenService, AuthModule)
      .signAccess(user)}`;
    await facade.startServer();
  });

  describe("GET /users", () => {
    let user2: User;

    beforeEach(async () => {
      user2 = new User({
        name: "test2",
        email: "test2@test.com",
        password: "password",
      });
      await database.persist(user2);
    });

    test("response", async () => {
      const response = await requester.request(
        HttpRequest.GET("/users") //
          .header("authorization", auth),
      );
      expect(response.json).toEqual({
        total: 2,
        items: [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
            verifiedAt: null,
          },
          expect.any(Object),
        ],
      });
    });

    test("pagination", async () => {
      const response = await requester.request(
        HttpRequest.GET("/users?limit=1") //
          .header("authorization", auth),
      );
      expect(response.json).toEqual({ total: 2, items: expect.any(Array) });
    });

    test("filter", async () => {
      const response = await requester.request(
        HttpRequest.GET(`/users?filter[id][$eq]=${user.id}`) //
          .header("authorization", auth),
      );
      expect(response.json).toEqual({ total: 1, items: expect.any(Array) });
    });

    test("order", async () => {
      const response = await requester.request(
        HttpRequest.GET("/users?order[name]=desc") //
          .header("authorization", auth),
      );
      expect(response.json).toMatchObject({
        total: 2,
        items: [{ id: user2.id }, { id: user.id }],
      });
    });
  });

  describe("GET /users/:id", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.GET(`/users/${user.id}`) //
          .header("authorization", auth),
      );
      expect(response.json).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        verifiedAt: null,
      });
    });
  });

  describe("GET /users/me", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.GET(`/users/me`) //
          .header("authorization", auth),
      );
      expect(response.json).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        verifiedAt: null,
      });
    });
  });

  describe("PATCH /users/me", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.PATCH(`/users/me`)
          .json({ name: "new name" })
          .header("authorization", auth),
      );
      expect(response.json).toEqual({
        id: user.id,
        name: "new name",
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        verifiedAt: null,
      });
    });

    it("should return 403 when target is not self", async () => {
      const response = await requester.request(
        HttpRequest.PATCH(`/users/other`)
          .json({ name: "new name" })
          .header("authorization", auth),
      );
      expect(response.statusCode).toBe(403);
    });
  });

  describe("PUT /users/me/verification", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.PUT(`/users/me/verification`) //
          .header("authorization", auth),
      );
      expect(response.statusCode).toBe(204);
    });

    it("should return 403 for duplications", async () => {
      const pool = facade.app.get(UserVerificationCodePool, UserModule);
      pool.request(user.id);
      const response = await requester.request(
        HttpRequest.PUT(`/users/me/verification`) //
          .header("authorization", auth),
      );
      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /users/me/verification", () => {
    it("should return 204 when verification exists", async () => {
      const pool = facade.app.get(UserVerificationCodePool, UserModule);
      pool.request(user.id);
      const response = await requester.request(
        HttpRequest.GET(`/users/me/verification`) //
          .header("authorization", auth),
      );
      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when verification not found", async () => {
      const response = await requester.request(
        HttpRequest.GET(`/users/me/verification`) //
          .header("authorization", auth),
      );
      expect(response.statusCode).toBe(404);
    });
  });

  describe("PUT /users/me/verification/confirmation", () => {
    test("code matched", async () => {
      const mapSetSpy = jest.spyOn(ExpirableMap.prototype, "set");
      const pool = facade.app.get(UserVerificationCodePool, UserModule);
      pool.request(user.id);
      expect(mapSetSpy).toHaveBeenCalledTimes(1);
      const code = mapSetSpy.mock.lastCall[1];
      const response = await requester.request(
        HttpRequest.PUT(`/users/me/verification/confirmation`)
          .json({ code })
          .header("authorization", auth),
      );
      expect(response.statusCode).toBe(204);
      const userNew = await database.query(User).findOne();
      expect(userNew.verifiedAt).toBeInstanceOf(Date);
    });

    test("code not matched", async () => {
      const pool = facade.app.get(UserVerificationCodePool, UserModule);
      pool.request(user.id);
      const response = await requester.request(
        HttpRequest.PUT(`/users/me/verification/confirmation`)
          .json({ code: "not-match" })
          .header("authorization", auth),
      );
      expect(response.statusCode).toBe(400);
    });
  });
});
