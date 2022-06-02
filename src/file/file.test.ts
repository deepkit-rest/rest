import { App } from "@deepkit/app";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import { Database } from "@deepkit/orm";
import { entities } from "src/core/entities";
import { RequestContext } from "src/core/request-context";
import { DatabaseModule } from "src/database/database.module";
import { DATABASE } from "src/database/database.tokens";
import { FileEngineModule } from "src/file-engine/file-engine.module";
import { User } from "src/user/user.entity";

import { FileModule } from "./file.module";
import { FileRecord } from "./file-record.entity";

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
    await facade.startServer();
  });

  describe("POST /files", () => {
    it("should work", async () => {
      const response = await requester.request(
        HttpRequest.POST("/files").json({
          name: "test.txt",
          path: "/dir",
          size: 100,
        }),
      );
      expect(response.json).toEqual({
        id: expect.any(String),
        owner: user.id,
        name: "test.txt",
        path: "/dir",
        size: 100,
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
          size: 100,
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
            size: 100,
            createdAt: expect.any(String),
          },
        ],
      });
    });
  });
});
