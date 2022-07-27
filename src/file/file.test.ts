import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { Database } from "@deepkit/orm";
import { CoreModule } from "src/core/core.module";
import { RequestContext } from "src/core/request-context";
import { DatabaseExtensionModule } from "src/database-extension/database-extension.module";
import { FileEngine } from "src/file-engine/file-engine.interface";
import { FileEngineModule } from "src/file-engine/file-engine.module";
import { MemoryFileEngine } from "src/file-engine/implementations/memory";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { RestModule } from "src/rest/rest.module";
import { User } from "src/user/user.entity";
import { Readable } from "stream";

import { FileModule } from "./file.module";
import { FileChunkUploadManager } from "./file-chunk-upload-manager.service";
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
      const parent = new FileSystemRecord({ owner: user, name: "dir" });
      await database.persist(parent);
      const response = await requester.request(
        HttpRequest.POST("/files").json({
          name: "test.txt",
          parent: parent.id,
        }),
      );
      expect(response.json).toEqual({
        id: expect.any(String),
        owner: user.id,
        parent: parent.id,
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

    test("?path=<valid>", async () => {
      const owner = user;
      const dir = new FileSystemRecord({ owner, name: "dir" });
      const file = new FileSystemRecord({ owner, name: "file", parent: dir });
      await database.persist(dir, file);
      const response = await requester.request(
        HttpRequest.GET(`/files?path=/dir/file`),
      );
      expect(response.json).toMatchObject({
        total: 1,
        items: [{ id: file.id }],
      });
    });

    test("?path=<invalid>", async () => {
      const response = await requester.request(
        HttpRequest.GET(`/files?path=should/not/exist`),
      );
      expect(response.statusCode).toBe(200);
      expect(response.json).toEqual({ total: 0, items: [] });
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
      const response = await requester.request(
        HttpRequest.PUT(`/files/${record.id}/content`).body(Buffer.from("v")),
      );
      expect(response.statusCode).toBe(204);
      expect(response.bodyString).toBe("");
      const recordNew = await database.query(FileSystemRecord).findOne();
      expect(recordNew).toMatchObject({
        contentKey: expect.any(String),
        contentIntegrity: expect.any(String),
        contentSize: 1,
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const stream = MemoryFileEngine.storage.get(recordNew.contentKey!);
      expect(stream?.toString()).toEqual("v");
    });
  });

  describe("GET /files/:id/content", () => {
    it("should work", async () => {
      const fileEngine = facade.app.get(FileEngine);
      const contentKey = await fileEngine.store(
        Readable.from(Buffer.from("v")),
      );
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      record.contentKey = contentKey;
      record.contentIntegrity = "integrity";
      record.contentSize = 1;
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/content`),
      );
      expect(response.statusCode).toBe(200);
      await new Promise((r) => response.once("finish", r));
      expect(response.body.toString()).toBe("v");
    });

    it("should work in partial mode", async () => {
      const fileEngine = facade.app.get(FileEngine);
      const contentKey = await fileEngine.store(
        Readable.from(Buffer.from("vvv")),
      );
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      record.contentKey = contentKey;
      record.contentIntegrity = "integrity";
      record.contentSize = 3;
      await database.persist(record);
      const request = HttpRequest.GET(`/files/${record.id}/content`);
      request.header("range", "bytes=0-1");
      const response = await requester.request(request);
      await new Promise((r) => response.once("finish", r));
      expect(response.statusCode).toBe(206);
      expect(response.headers).toEqual({ ["Content-Range"]: "bytes 0-1/3" });
      expect(response.body.toString()).toBe("vv");
    });

    it("should return 404 when content not uploaded", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/content`),
      );
      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /files/:id/content/chunks", () => {
    test("response", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const manager = facade.app.get(FileChunkUploadManager, FileModule);
      await manager.store(record.id, Readable.from(Buffer.from("v")), 10);
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/content/chunks`),
      );
      expect(response.statusCode).toBe(200);
      expect(response.json).toEqual([10]);
    });
  });

  describe("PUT /files/:id/content/chunks/:index", () => {
    test("response", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const manager = facade.app.get(FileChunkUploadManager, FileModule);
      const response = await requester.request(
        HttpRequest.PUT(`/files/${record.id}/content/chunks/10`).body(
          Buffer.from("v"),
        ),
      );
      expect(response.statusCode).toBe(204);
      expect(response.bodyString).toBe("");
      expect(manager.inspect(record.id)).toEqual([10]);
      const stream = await manager.merge(record.id);
      expect(stream.read().toString()).toEqual("v");
      const recordNew = await database.query(FileSystemRecord).findOne();
      expect(recordNew.isContentDefined()).toBe(false);
    });

    test("workflow", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      await requester.request(
        HttpRequest.PUT(`/files/${record.id}/content/chunks/1`) //
          .body(Buffer.from("v1")),
      );
      await requester.request(
        HttpRequest.PUT(`/files/${record.id}/content/chunks/2`) //
          .body(Buffer.from("v2")),
      );
      await requester.request(
        HttpRequest.PUT(`/files/${record.id}/content/chunks/last`) //
          .body(Buffer.from("last")),
      );
      const recordNew = await database.query(FileSystemRecord).findOne();
      expect(recordNew.isContentDefined()).toBe(true);
      const fileEngine = facade.app.get(FileEngine);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const stream = await fileEngine.fetch(recordNew.contentKey!);
      expect(stream.read().toString()).toEqual("v1v2last");
    });
  });

  describe("DELETE /files/:id/content/chunks", () => {
    test("response", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const manager = facade.app.get(FileChunkUploadManager, FileModule);
      manager.store(record.id, Readable.from(Buffer.from("v")), 10);
      const response = await requester.request(
        HttpRequest.DELETE(`/files/${record.id}/content/chunks`),
      );
      expect(response.statusCode).toBe(204);
      expect(response.bodyString).toBe("");
      expect(manager.inspect(record.id)).toEqual([]);
    });
  });

  describe("GET /files/:id/integrity", () => {
    it("should return 204 if content is uploaded and complete", async () => {
      const fileEngine = facade.app.get(FileEngine);
      const content = Buffer.from("v");
      const contentKey = await fileEngine.store(Readable.from(content));
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      record.contentKey = contentKey;
      record.contentIntegrity = await FileStreamUtils.hash(
        Readable.from(content),
      );
      record.contentSize = 1;
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/integrity`),
      );
      expect(response.statusCode).toBe(204);
    });

    it("should return 404 if content is not uploaded", async () => {
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}/integrity`),
      );
      expect(response.statusCode).toBe(404);
    });

    it("should return 404 if content is broken", async () => {
      const fileEngine = facade.app.get(FileEngine);
      const contentKey = await fileEngine.store(
        Readable.from(Buffer.from("v")),
      );
      const record = new FileSystemRecord({ owner: user, name: "test.txt" });
      record.contentKey = contentKey;
      record.contentIntegrity = "not-matching";
      await database.persist(record);

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
