import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import { Database } from "@deepkit/orm";
import { entities } from "src/core/entities";
import { RequestContext } from "src/core/request-context";
import { DatabaseModule } from "src/database/database.module";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { RestModule } from "src/rest/rest.module";
import { User } from "src/user/user.entity";

import { Tag } from "./tag.entity";
import { TagModule } from "./tag.module";

describe("Tag", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;
  let user: User;

  beforeEach(async () => {
    facade = createTestingApp({
      imports: [
        new HttpExtensionModule(),
        new RestModule({ prefix: "" }),
        new DatabaseModule({ url: ":memory:" }).withEntities(...entities),
        new TagModule(),
      ],
      providers: [
        {
          provide: RequestContext,
          useFactory: () => ({ user: { id: user.id } }),
        },
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
    facade.app.get(Logger).setTransport([new MemoryLoggerTransport()]); // temporary workaround: transport setup is not working, so we have to manually set it up
    await facade.startServer();
  });

  describe("GET /tags", () => {
    let user2: User;

    beforeEach(async () => {
      user2 = new User({
        name: "test2",
        email: "test@test2.email",
        password: "password",
      });
      await database.persist(
        new Tag({ owner: user, name: "name1" }),
        new Tag({ owner: user, name: "name2" }),
        new Tag({ owner: user, name: "name3" }),
        new Tag({ owner: user2, name: "name4" }),
      );
    });

    test("response", async () => {
      const response = await requester.request(HttpRequest.GET("/tags"));
      expect(response.json).toEqual({
        total: 3,
        items: [
          {
            id: expect.any(String),
            owner: user.id,
            name: "name1",
            createdAt: expect.any(String),
          },
          expect.anything(),
          expect.anything(),
        ],
      });
    });

    test("pagination", async () => {
      const response = await requester.request(
        HttpRequest.GET("/tags?limit=1&offset=1"),
      );
      expect(response.json).toMatchObject({
        total: 3,
        items: [{ name: "name2" }],
      });
    });

    test("filtering", async () => {
      const response = await requester.request(
        HttpRequest.GET("/tags?filter[name][$eq]=name2"),
      );
      expect(response.json).toMatchObject({
        total: 1,
        items: [{ name: "name2" }],
      });
    });

    test("ordering", async () => {
      const response = await requester.request(
        HttpRequest.GET("/tags?order[name]=desc"),
      );
      expect(response.json).toMatchObject({
        total: 3,
        items: [{ name: "name3" }, { name: "name2" }, { name: "name1" }],
      });
    });
  });

  describe("POST /tags", () => {
    test("basic", async () => {
      const response = await requester.request(
        HttpRequest.POST("/tags").json({ name: "name" }),
      );
      expect(response.json).toEqual({
        id: expect.any(String),
        owner: user.id,
        name: "name",
        createdAt: expect.any(String),
      });
      expect(await database.query(Tag).count()).toBe(1);
    });
  });

  describe("GET /tags/:id", () => {
    test("basic", async () => {
      const tag = new Tag({ owner: user, name: "name" });
      await database.persist(tag);
      const response = await requester.request(
        HttpRequest.GET(`/tags/${tag.id}`),
      );
      expect(response.json).toEqual({
        id: tag.id,
        owner: user.id,
        name: "name",
        createdAt: expect.any(String),
      });
    });
  });

  describe("PATCH /tags/:id", () => {
    test("basic", async () => {
      const tag = new Tag({ owner: user, name: "name" });
      await database.persist(tag);
      const response = await requester.request(
        HttpRequest.PATCH(`/tags/${tag.id}`).json({ name: "new name" }),
      );
      expect(response.json).toEqual({
        id: tag.id,
        owner: user.id,
        name: "new name",
        createdAt: expect.any(String),
      });
    });
  });

  describe("DELETE /tags/:id", () => {
    test("basic", async () => {
      const tag = new Tag({ owner: user, name: "name" });
      await database.persist(tag);
      const response = await requester.request(
        HttpRequest.DELETE(`/tags/${tag.id}`),
      );
      expect(response.bodyString).toBe("");
      expect(response.statusCode).toBe(204);
    });
  });
});
