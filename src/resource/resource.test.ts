import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { http, HttpKernel, HttpQueries, HttpRequest } from "@deepkit/http";
import { Inject, InjectorContext } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { AutoIncrement, entity, PrimaryKey } from "@deepkit/type";

import { ResourceModule } from "./resource.module";
import { ResourceCrudAdapter } from "./resource-crud-adapter.interface";
import { ResourceCrudHandler } from "./resource-crud-handler.service";
import { ResourcePagination } from "./resource-listing.typings";

describe("Resource", () => {
  describe("CRUD", () => {
    let facade: TestingFacade<App<any>>;
    let requester: HttpKernel;
    let database: orm.Database;

    async function prepare<Entity>(
      entity: ClassType<Entity>,
      adapter: ClassType<ResourceCrudAdapter<Entity>>,
      controller: ClassType,
    ) {
      facade = createTestingApp({
        imports: [new ResourceModule<Entity>().withAdapter(adapter)],
        controllers: [controller],
        providers: [
          {
            provide: "database",
            useValue: new orm.Database(
              new orm.MemoryDatabaseAdapter(), //
              [entity],
            ),
          },
        ],
      });
      requester = facade.app.get(HttpKernel);
      database = facade.app.get(InjectorContext).get<orm.Database>("database");
      // temporary workaround: transport setup is not working, so we have to
      // manually set it up
      facade.app.get(Logger).setTransport([new MemoryLoggerTransport()]);
      await facade.startServer();
    }

    describe("Pagination", () => {
      @entity.name("my-entity")
      class MyEntity {
        id: number & AutoIncrement & PrimaryKey = 0;
      }

      class MyAdapter implements ResourceCrudAdapter<MyEntity> {
        limit = 1;
        offset = 1;
        constructor(private db: Inject<orm.Database, "database">) {}
        query(): orm.Query<MyEntity> {
          return this.db.query(MyEntity);
        }
      }

      @http.controller()
      class MyController {
        constructor(private handler: ResourceCrudHandler<MyEntity>) {}
        @http.GET()
        handle(pagination: HttpQueries<ResourcePagination>) {
          return this.handler.list({ pagination });
        }
      }

      beforeEach(async () => {
        await prepare(MyEntity, MyAdapter, MyController);
      });

      it("should work when query params not specified", async () => {
        await database.persist(new MyEntity(), new MyEntity());
        const response = await requester.request(HttpRequest.GET("/"));
        expect(response.json).toEqual({ total: 2, items: [{ id: 2 }] });
      });

      it.each`
        limit | offset | items
        ${1}  | ${1}   | ${[{ id: 2 }]}
        ${2}  | ${1}   | ${[{ id: 2 }, { id: 3 }]}
        ${1}  | ${2}   | ${[{ id: 3 }]}
      `(
        "should work when limit is $limit and offset is $offset",
        async ({ limit, offset, items }) => {
          await database.persist(
            new MyEntity(),
            new MyEntity(),
            new MyEntity(),
          );
          const response = await requester.request(
            HttpRequest.GET("/").query({ limit, offset }),
          );
          expect(response.json).toEqual({ total: 3, items });
        },
      );

      it.each`
        limit  | offset
        ${1}   | ${0}
        ${0}   | ${-1}
        ${"a"} | ${"b"}
      `(
        "should fail when limit is $limit and offset is $offset",
        async ({ limit, offset }) => {
          const response = await requester.request(
            HttpRequest.GET("/").query({ limit, offset }),
          );
          expect(response.statusCode).toBe(400);
        },
      );
    });
  });
});
