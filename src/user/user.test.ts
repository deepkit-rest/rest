import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import { Database } from "@deepkit/orm";
import { ExpirableMap } from "src/common/map";
import { entities } from "src/core/entities";
import { RequestContext } from "src/core/request-context";
import { DatabaseModule } from "src/database/database.module";
import { DATABASE } from "src/database/database.tokens";
import { Mailer } from "src/mailer/mailer.service";

import { User } from "./user.entity";
import { UserModule } from "./user.module";
import { UserVerificationService } from "./user-verification.service";

describe("User", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;
  let user: User;

  beforeEach(async () => {
    facade = createTestingApp({
      imports: [
        new DatabaseModule({ url: ":memory:" }).withEntities(...entities),
        new UserModule(),
      ],
      providers: [
        {
          provide: RequestContext,
          useFactory: () => ({ user: { id: user.id } }),
        },
        { provide: Mailer, useValue: { send: jest.fn() } },
      ],
    });
    requester = facade.app.get(HttpKernel);
    database = facade.app.get(InjectorContext).get<Database>(DATABASE);
    await database.migrate();
    user = new User({
      name: "test",
      email: "test@test.com",
      password: "password",
    });
    await database.persist(user);
    // temporary workaround: transport setup is not working, so we have to
    // manually set it up
    facade.app.get(Logger).setTransport([new MemoryLoggerTransport()]);
    await facade.startServer();
  });

  describe("GET /users", () => {
    it("should work", async () => {
      const response = await requester.request(HttpRequest.GET("/users"));
      expect(response.json).toEqual({
        total: 1,
        items: [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
            verifiedAt: null,
          },
        ],
      });
    });
  });

  describe("GET /users/:id", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.GET(`/users/${user.id}`),
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
      const response = await requester.request(HttpRequest.GET(`/users/me`));
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
        HttpRequest.PATCH(`/users/me`).json({
          name: "new name",
        }),
      );
      expect(response.json).toEqual({
        id: user.id,
        name: "new name",
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        verifiedAt: null,
      });
    });
  });

  describe("PUT /users/me/verification", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.PUT(`/users/me/verification`),
      );
      expect(response.statusCode).toBe(204);
    });

    it("should return 403 for duplications", async () => {
      const service = facade.app.get(UserVerificationService, UserModule);
      service.request(user.id);
      const response = await requester.request(
        HttpRequest.PUT(`/users/me/verification`),
      );
      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /users/me/verification", () => {
    it("should return 204 when verification exists", async () => {
      const service = facade.app.get(UserVerificationService, UserModule);
      service.request(user.id);
      const response = await requester.request(
        HttpRequest.GET(`/users/me/verification`),
      );
      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when verification not found", async () => {
      const response = await requester.request(
        HttpRequest.GET(`/users/me/verification`),
      );
      expect(response.statusCode).toBe(404);
    });
  });

  describe("PUT /users/me/verification/confirmation", () => {
    test("code matched", async () => {
      const mapSetSpy = jest.spyOn(ExpirableMap.prototype, "set");
      const service = facade.app.get(UserVerificationService, UserModule);
      service.request(user.id);
      expect(mapSetSpy).toHaveBeenCalledTimes(1);
      const code = mapSetSpy.mock.lastCall[1];
      const request = HttpRequest.PUT(`/users/me/verification/confirmation`);
      const response = await requester.request(request.json({ code }));
      expect(response.statusCode).toBe(204);
      const userNew = await database.query(User).findOne();
      expect(userNew.verifiedAt).toBeInstanceOf(Date);
    });

    test("code not matched", async () => {
      const service = facade.app.get(UserVerificationService, UserModule);
      service.request(user.id);
      const response = await requester.request(
        HttpRequest.PUT(`/users/me/verification/confirmation`).json({
          code: "not-match",
        }),
      );
      expect(response.statusCode).toBe(400);
    });
  });
});
