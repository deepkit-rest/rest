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
import { FileEngine } from "src/file-engine/file-engine.interface";
import { FileEngineModule } from "src/file-engine/file-engine.module";
import { User } from "src/user/user.entity";
import { Readable } from "stream";

import { FileModule } from "./file.module";
import { FileRecord } from "./file-record.entity";
import { FileStreamUtils } from "./file-stream.utils";

describe("File", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;
  let user: User;

  beforeEach(async () => {
    facade = createTestingApp({
      imports: [
        new DatabaseModule({ url: ":memory:" }).withEntities(...entities),
        new FileEngineModule({ name: "memory" }),
        new FileModule(),
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
    facade.app
      .get(InjectorContext)
      .get<Logger>()
      .setTransport([new MemoryLoggerTransport()]);
    await facade.startServer();
  });

  describe("POST /files", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.POST("/files").json({
          name: "test.txt",
          path: "/dir",
        }),
      );
      expect(response.json).toEqual({
        id: expect.any(String),
        owner: user.id,
        name: "test.txt",
        path: "/dir",
        contentSize: null,
        contentKey: null,
        contentIntegrity: null,
        createdAt: expect.any(String),
      });
    });
  });

  describe("GET /files", () => {
    it("should work", async () => {
      await database.persist(
        new FileRecord({
          owner: user,
          name: "test.txt",
          path: "/dir",
        }),
      );
      const response = await requester.request(HttpRequest.GET("/files"));
      expect(response.json).toEqual({
        total: 1,
        items: [
          {
            id: expect.any(String),
            owner: user.id,
            name: "test.txt",
            path: "/dir",
            contentKey: null,
            contentIntegrity: null,
            contentSize: null,
            createdAt: expect.any(String),
          },
        ],
      });
    });

    it("should filter query", async () => {
      const user2 = new User({
        name: "name",
        email: "email@email.com",
        password: "password",
      });
      const record = new FileRecord({
        owner: user2,
        name: "test.txt",
        path: "/dir",
      });
      await database.persist(user2, record);
      const response = await requester.request(HttpRequest.GET("/files"));
      expect(response.json).toEqual({ total: 0, items: [] });
    });
  });

  describe("GET /files/:id", () => {
    it("should work", async () => {
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.GET(`/files/${record.id}`),
      );
      expect(response.json).toEqual({
        id: record.id,
        owner: user.id,
        name: record.name,
        path: record.path,
        contentKey: null,
        contentIntegrity: null,
        contentSize: null,
        createdAt: record.createdAt.toISOString(),
      });
    });
  });

  describe("PATCH /files/:id", () => {
    it("should work", async () => {
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.PATCH(`/files/${record.id}`).json({ name: "updated" }),
      );
      expect(response.json).toEqual({
        id: record.id,
        owner: user.id,
        name: "updated",
        path: record.path,
        contentKey: null,
        contentIntegrity: null,
        contentSize: null,
        createdAt: record.createdAt.toISOString(),
      });
      const recordNew = await database.query(FileRecord).findOne();
      expect(recordNew).toMatchObject({ name: "updated" });
    });
  });

  describe("DELETE /files/:id", () => {
    it("should work", async () => {
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
      await database.persist(record);
      const response = await requester.request(
        HttpRequest.DELETE(`/files/${record.id}`),
      );
      expect(response.statusCode).toBe(204);
      expect(response.bodyString).toBe("");
      await expect(database.query(FileRecord).count()).resolves.toBe(0);
    });
  });

  describe("PUT /files/:id/content", () => {
    it("should work", async () => {
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
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
      await expect(database.query(FileRecord).findOne()).resolves.toMatchObject(
        {
          contentKey: "ref",
          contentIntegrity: expect.any(String),
          contentSize: 1,
        },
      );
      expect(fileEngineStoreSpy).toHaveBeenCalledTimes(1);
      expect(fileEngineStoreSpy).toHaveBeenCalledWith(expect.any(Readable));
    });
  });

  describe("GET /files/:id/content", () => {
    it("should work", async () => {
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
      record.contentKey = "ref";
      record.contentIntegrity = "integrity";
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
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
      record.contentKey = "ref";
      record.contentIntegrity = "integrity";
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
      expect(response.body.toString()).toBe("v");
    });

    it("should return 404 when content not uploaded", async () => {
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
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
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
      const recordContent = Buffer.from("v");
      record.contentKey = "ref";
      record.contentIntegrity = await FileStreamUtils.hash(
        Readable.from(recordContent),
      );
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
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
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
      const record = new FileRecord({
        owner: user,
        name: "test.txt",
        path: "/dir",
      });
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
});
