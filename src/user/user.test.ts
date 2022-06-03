import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import { Database } from "@deepkit/orm";
import { entities } from "src/core/entities";
import { RequestContext } from "src/core/request-context";
import { DatabaseModule } from "src/database/database.module";
import { DATABASE } from "src/database/database.tokens";

import { User } from "./user.entity";
import { UserModule } from "./user.module";

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
      });
    });
  });
});
