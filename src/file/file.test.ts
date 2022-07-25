import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { Database } from "@deepkit/orm";
import { CoreModule } from "src/core/core.module";
import { RequestContext } from "src/core/request-context";
import { DatabaseExtensionModule } from "src/database-extension/database-extension.module";
import { FileEngine } from "src/file-engine/file-engine.interface";
import { FileEngineModule } from "src/file-engine/file-engine.module";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { RestModule } from "src/rest/rest.module";
import { User } from "src/user/user.entity";
import { Readable } from "stream";

import { FileModule } from "./file.module";
import { FileStreamUtils } from "./file-stream.utils";
import { FileSystemRecord } from "./file-system-record.entity";
import { FileSystemTag } from "./file-system-tag.entity";

describe("File", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;
  let user: User;

  beforeEach(async () => {
    facade = createTestingApp({
      imports: [
        new CoreModule(),
        new HttpExtensionModule(),
        new DatabaseExtensionModule(),
        new RestModule({ prefix: "" }),
        new FileEngineModule({ name: "memory" }),
        new FileModule(),
      ],
      providers: [
        {
          provide: RequestContext,
          useFactory: () => ({ user: { id: user.id } }),
          scope: "http",
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
    await facade.startServer();
  });

  describe("POST /files", () => {
    it("should work", async () => {
      const record = new FileSystemRecord({ owner: user, name: "a.txt" });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.POST("/files").json({
          name: "test.txt",
          parent: record.id,
        }),
      );
      expect(response.json).toEqual({
        id: expect.any(String),
        owner: user.id,
        parent: null,
        name: "test.txt",
        contentSize: null,
        contentKey: null,
        contentIntegrity: null,
        createdAt: expect.any(String),
      });
    });
  });

  describe("GET /files", () => {
    test("response", async () => {
      const user2 = new User({
        name: "name",
        email: "email@email.com",
        password: "password",
      });
      await database.persist(
        new FileSystemRecord({ owner: user, name: "test.txt" }),
        new FileSystemRecord({ owner: user2, name: "test2.txt" }),
      );
      const response = await requester.request(HttpRequest.GET("/files"));
      expect(response.json).toEqual({
        total: 1,
        items: [
          {
            id: expect.any(String),
            owner: user.id,
            parent: null,
            name: "test.txt",
            contentKey: null,
            contentIntegrity: null,
            contentSize: null,
            createdAt: expect.any(String),
          },
        ],
      });
    });

    test("pagination", async () => {
      await database.persist(
        new FileSystemRecord({ owner: user, name: "test1.txt" }),
        new FileSystemRecord({ owner: user, name: "test2.txt" }),
      );
      const response = await requester.request(
        HttpRequest.GET("/files?limit=1"),
      );
      expect(response.json).toEqual({
        total: 2,
        items: expect.any(Array),
      });
    });

    test("filter", async () => {
      await database.persist(
        new FileSystemRecord({ owner: user, name: "test1.txt" }),
      );
      const response = await requester.request(
        HttpRequest.GET("/files?filter[id][$eq]=notfound"),
      );
      expect(response.json).toEqual({ total: 0, items: [] });
    });

    test("order", async () => {
      const records = [
        new FileSystemRecord({ owner: user, name: "test1.txt" }),
        new FileSystemRecord({ owner: user, name: "test2.txt" }),
      ];
      await database.persist(...records);
      const response = await requester.request(
        HttpRequest.GET("/files?order[name]=desc"),
      );
      expect(response.json).toMatchObject({
        total: 2,
        items: [{ id: records[1].id }, { id: records[0].id }],
      });
    });
  });

  describe("GET /files/:id", () => {
    it("should work", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}`),
      );
      expect(response.json).toEqual({
        id: record.id,
        owner: user.id,
        parent: null,
        name: record.name,
        contentKey: null,
        contentIntegrity: null,
        contentSize: null,
        createdAt: record.createdAt.toISOString(),
      });
    });
  });

  describe("PATCH /files/:id", () => {
    it("should work", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.PATCH(`/files/${record.id}`).json({ name: "updated" }),
      );
      expect(response.json).toEqual({
        id: record.id,
        owner: user.id,
        parent: null,
        name: "updated",
        contentKey: null,
        contentIntegrity: null,
        contentSize: null,
        createdAt: record.createdAt.toISOString(),
      });
      const recordNew = await database.query(FileSystemRecord).findOne();
      expect(recordNew).toMatchObject({ name: "updated" });
    });
  });

  describe("DELETE /files/:id", () => {
    it("should work", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.DELETE(`/files/${record.id}`),
      );
      expect(response.statusCode).toBe(204);
      expect(response.bodyString).toBe("");
      await expect(database.query(FileSystemRecord).count()).resolves.toBe(0);
    });
  });

  describe("PUT /files/:id/content", () => {
    it("should work", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const fileEngine = facade.app.get(FileEngine);
      const fileEngineStoreSpy = jest
        .spyOn(fileEngine, "store")
        .mockReturnValue(Promise.resolve("ref"));
      const response = await requester.request(
        HttpRequest.PUT(`/files/${record.id}/content`).body(Buffer.from("v")),
      );
      expect(response.statusCode).toBe(204);
      expect(response.bodyString).toBe("");
      await expect(
        database.query(FileSystemRecord).findOne(),
      ).resolves.toMatchObject({
        contentKey: "ref",
        contentIntegrity: expect.any(String),
        contentSize: 1,
      });
      expect(fileEngineStoreSpy).toHaveBeenCalledTimes(1);
      expect(fileEngineStoreSpy).toHaveBeenCalledWith(expect.any(Readable));
    });
  });

  describe("GET /files/:id/content", () => {
    it("should work", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      record.contentKey = "ref";
      record.contentIntegrity = "integrity";
      record.contentSize = 1;
      await database.persist(record);
      const fileEngine = facade.app.get(FileEngine);
      const fileEngineRetrieveSpy = jest
        .spyOn(fileEngine, "retrieve")
        .mockReturnValue(Promise.resolve(Readable.from(Buffer.from("v"))));
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/content`),
      );
      expect(response.statusCode).toBe(200);
      expect(fileEngineRetrieveSpy).toHaveBeenCalledTimes(1);
      expect(fileEngineRetrieveSpy).toHaveBeenCalledWith("ref");
      await new Promise((r) => response.once("finish", r));
      expect(response.body.toString()).toBe("v");
    });

    it("should work in partial mode", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      record.contentKey = "ref";
      record.contentIntegrity = "integrity";
      record.contentSize = 1;
      await database.persist(record);
      const fileEngine = facade.app.get(FileEngine);
      const spy = jest
        .spyOn(fileEngine, "retrieve")
        .mockReturnValue(Promise.resolve(Readable.from(Buffer.from("v"))));
      const request = HttpRequest.GET(`/files/${record.id}/content`);
      request.header("range", "bytes=0-1");
      const response = await requester.request(request);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("ref", { start: 0, end: 1 });
      await new Promise((r) => response.once("finish", r));
      expect(response.statusCode).toBe(206);
      expect(response.headers).toEqual({ ["Content-Range"]: "bytes 0-1/1" });
      expect(response.body.toString()).toBe("v");
    });

    it("should return 404 when content not uploaded", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const fileEngine = facade.app.get(FileEngine);
      const fileEngineRetrieveSpy = jest.spyOn(fileEngine, "retrieve");
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/content`),
      );
      expect(response.statusCode).toBe(404);
      expect(fileEngineRetrieveSpy).not.toHaveBeenCalled();
    });
  });

  describe("GET /files/:id/integrity", () => {
    it("should return 204 if content is uploaded and complete", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      const recordContent = Buffer.from("v");
      record.contentKey = "ref";
      record.contentIntegrity = await FileStreamUtils.hash(
        Readable.from(recordContent),
      );
      record.contentSize = 1;
      await database.persist(record);

      const fileEngine = facade.app.get(FileEngine);
      jest
        .spyOn(fileEngine, "retrieve")
        .mockReturnValue(Promise.resolve(Readable.from(recordContent)));

      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/integrity`),
      );
      expect(response.statusCode).toBe(204);
    });

    it("should return 404 if content is not uploaded", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);

      const fileEngine = facade.app.get(FileEngine);
      const fileEngineRetrieveSpy = jest.spyOn(fileEngine, "retrieve");

      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/integrity`),
      );
      expect(response.statusCode).toBe(404);
      expect(fileEngineRetrieveSpy).not.toHaveBeenCalled();
    });

    it("should return 404 if content is broken", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      const recordContent = Buffer.from("v");
      record.contentKey = "ref";
      record.contentIntegrity = "not-matching";
      await database.persist(record);

      const fileEngine = facade.app.get(FileEngine);
      jest
        .spyOn(fileEngine, "retrieve")
        .mockReturnValue(Promise.resolve(Readable.from(recordContent)));

      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/integrity`),
      );
      expect(response.statusCode).toBe(404);
    });
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
        new FileSystemTag({ owner: user, name: "name1" }),
        new FileSystemTag({ owner: user, name: "name2" }),
        new FileSystemTag({ owner: user, name: "name3" }),
        new FileSystemTag({ owner: user2, name: "name4" }),
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
      expect(await database.query(FileSystemTag).count()).toBe(1);
    });
  });

  describe("GET /tags/:id", () => {
    test("basic", async () => {
      const tag = new FileSystemTag({ owner: user, name: "name" });
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
      const tag = new FileSystemTag({ owner: user, name: "name" });
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
      const tag = new FileSystemTag({ owner: user, name: "name" });
      await database.persist(tag);
      const response = await requester.request(
        HttpRequest.DELETE(`/tags/${tag.id}`),
      );
      expect(response.bodyString).toBe("");
      expect(response.statusCode).toBe(204);
    });
  });
});
