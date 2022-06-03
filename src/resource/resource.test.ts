import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { http, HttpKernel, HttpQueries, HttpRequest } from "@deepkit/http";
import { Inject, InjectorContext } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import {
  AutoIncrement,
  BackReference,
  entity,
  PrimaryKey,
  Reference,
} from "@deepkit/type";

import { ResourceModule } from "./resource.module";
import { ResourceCrudAdapter } from "./resource-crud-adapter.interface";
import { ResourceCrudHandler } from "./resource-crud-handler.service";
import { ResourceFilterMap } from "./resource-filter.typings";
import { ResourcePagination } from "./resource-listing.typings";
import { ResourceOrderMap } from "./resource-order.typings";

describe("Resource", () => {
  describe("CRUD", () => {
    let facade: TestingFacade<App<any>>;
    let requester: HttpKernel;
    let database: orm.Database;

    async function prepare<Entity>(
      entity: ClassType<Entity>,
      adapter: ClassType<ResourceCrudAdapter<Entity>>,
      controller: ClassType,
      entities: ClassType[] = [],
    ) {
      facade = createTestingApp({
        imports: [new ResourceModule<Entity>().withAdapter(adapter)],
        controllers: [controller],
        providers: [
          {
            provide: "database",
            useValue: new orm.Database(
              new orm.MemoryDatabaseAdapter(), //
              [entity, ...entities],
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

    describe("Filter", () => {
      @entity.name("user")
      class User {
        id: number & AutoIncrement & PrimaryKey = 0;
        books: Book[] & BackReference = [];
      }
      @entity.name("book")
      class Book {
        id: number & AutoIncrement & PrimaryKey = 0;
        owner!: User & Reference;
      }

      class UserAdapter implements ResourceCrudAdapter<User> {
        constructor(private db: Inject<orm.Database, "database">) {}
        query(): orm.Query<User> {
          return this.db.query(User);
        }
      }

      @http.controller()
      class UserController {
        constructor(private handler: ResourceCrudHandler<User>) {}
        @http.GET()
        handle(filter: HttpQueries<ResourceFilterMap<User>>) {
          return this.handler.list({ filter });
        }
      }

      beforeEach(async () => {
        await prepare(User, UserAdapter, UserController, [Book]);
      });

      it.each`
        filter         | total | items
        ${{}}          | ${3}  | ${[{ id: 1 }, { id: 2 }, { id: 3 }]}
        ${"id[$eq]=1"} | ${1}  | ${[{ id: 1 }]}
        ${"id[$gt]=1"} | ${2}  | ${[{ id: 2 }, { id: 3 }]}
      `("should work with query $filter", async ({ filter, total, items }) => {
        await database.persist(new User(), new User(), new User());
        const request = HttpRequest.GET("/");
        request["queryPath"] = filter;
        const response = await requester.request(request);
        expect(response.json).toEqual({ total, items });
      });
    });

    describe("Order", () => {
      @entity.name("user")
      class User {
        id: number & AutoIncrement & PrimaryKey = 0;
        books: Book[] & BackReference = [];
      }
      @entity.name("book")
      class Book {
        id: number & AutoIncrement & PrimaryKey = 0;
        owner!: User & Reference;
      }

      class UserAdapter implements ResourceCrudAdapter<User> {
        constructor(private db: Inject<orm.Database, "database">) {}
        query(): orm.Query<User> {
          return this.db.query(User);
        }
      }

      @http.controller()
      class UserController {
        constructor(private handler: ResourceCrudHandler<User>) {}
        @http.GET()
        handle(order: HttpQueries<ResourceOrderMap<User>>) {
          return this.handler.list({ order });
        }
      }

      beforeEach(async () => {
        await prepare(User, UserAdapter, UserController, [Book]);
      });

      it.each`
        order        | items
        ${{}}        | ${[{ id: 1 }, { id: 2 }]}
        ${"id=asc"}  | ${[{ id: 1 }, { id: 2 }]}
        ${"id=desc"} | ${[{ id: 2 }, { id: 1 }]}
      `("should work with query $order", async ({ order, items }) => {
        await database.persist(new User(), new User());
        const request = HttpRequest.GET("/");
        request["queryPath"] = order;
        const response = await requester.request(request);
        expect(response.json).toEqual({ total: 2, items });
      });
    });
  });
});
