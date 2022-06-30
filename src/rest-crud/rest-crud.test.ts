import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpQueries, HttpRequest } from "@deepkit/http";
import { Inject, InjectorContext } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";
import {
  AutoIncrement,
  BackReference,
  entity,
  InlineRuntimeType,
  PrimaryKey,
  Reference,
} from "@deepkit/type";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { rest } from "src/rest/rest.decorator";
import { RestModule } from "src/rest/rest.module";
import { RestResource } from "src/rest/rest-resource";

import { RestCrudFilterMap } from "./models/rest-crud-filter-map";
import { RestCrudFilterMapFactory } from "./models/rest-crud-filter-map-factory";
import { RestCrudList, RestCrudPagination } from "./models/rest-crud-list";
import { RestCrudOrderMap } from "./models/rest-crud-order-map";
import { RestCrudModule } from "./rest-crud.module";
import { RestCrudHandler } from "./rest-crud-handler.service";

describe("REST CRUD", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: orm.Database;

  async function prepare<Entity>(
    resource: ClassType<RestResource<Entity>>,
    entities: ClassType[] = [],
  ) {
    facade = createTestingApp({
      imports: [
        new HttpExtensionModule(),
        new RestModule({ prefix: "", versioning: false }),
        new RestCrudModule(),
      ],
      controllers: [resource],
      providers: [
        {
          provide: "database",
          useValue: new orm.Database(new SQLiteDatabaseAdapter(), entities),
        },
      ],
    });
    requester = facade.app.get(HttpKernel);
    database = facade.app.get(InjectorContext).get<orm.Database>("database");
    await database.migrate();
    // temporary workaround: transport setup is not working, so we have to
    // manually set it up
    facade.app.get(Logger).setTransport([new MemoryLoggerTransport()]);
    await facade.startServer();
  }

  describe("CRUD", () => {
    @entity.name("my-entity")
    class MyEntity {
      id: number & AutoIncrement & PrimaryKey = 0;
      constructor(public included: boolean = true) {}
    }

    @rest.resource(MyEntity, "name").lookup("id")
    class MyResource implements RestResource<MyEntity> {
      constructor(
        private db: Inject<orm.Database, "database">,
        private handler: RestCrudHandler,
      ) {}
      query(): orm.Query<MyEntity> {
        return this.db.query(MyEntity).filter({ included: true });
      }
      @rest.action("GET")
      list(): Promise<RestCrudList<MyEntity>> {
        return this.handler.list(this, {
          pagination: { limit: 10, offset: 0 },
        });
      }

      @rest.action("GET").detailed()
      retrieve(id: number): Promise<MyEntity> {
        return this.handler.retrieve(this, { id });
      }
    }

    beforeEach(async () => {
      await prepare(MyResource, [MyEntity]);
    });

    describe("List", () => {
      it("should respect filter conditions", async () => {
        await database.persist(new MyEntity(), new MyEntity(false));
        const response = await requester.request(HttpRequest.GET("/name"));
        expect(response.statusCode).toBe(200);
        expect(response.json.total).toBe(1);
      });
    });

    describe("Retrieve", () => {
      it("should respect filter conditions", async () => {
        await database.persist(new MyEntity(), new MyEntity(false));
        const response1 = await requester.request(HttpRequest.GET("/name/1"));
        expect(response1.statusCode).toBe(200);
        const response2 = await requester.request(HttpRequest.GET("/name/2"));
        expect(response2.statusCode).toBe(404);
      });
    });
  });

  describe("Params", () => {
    describe("Pagination", () => {
      @entity.name("my-entity")
      class MyEntity {
        id: number & AutoIncrement & PrimaryKey = 0;
      }

      @rest.resource(MyEntity, "path")
      class MyResource implements RestResource<MyEntity> {
        constructor(
          private db: Inject<orm.Database, "database">,
          private handler: RestCrudHandler,
        ) {}
        query(): orm.Query<MyEntity> {
          return this.db.query(MyEntity);
        }
        @rest.action("GET")
        handle(pagination: HttpQueries<RestCrudPagination>) {
          return this.handler.list(this, { pagination });
        }
      }

      beforeEach(async () => {
        await prepare(MyResource, [MyEntity]);
      });

      it.each`
        limit | offset | items
        ${1}  | ${0}   | ${[{ id: 1 }]}
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
            HttpRequest.GET("/path").query({ limit, offset }),
          );
          expect(response.json).toEqual({ total: 3, items });
        },
      );

      it.each`
        limit  | offset
        ${0}   | ${1}
        ${-1}  | ${1}
        ${1}   | ${-1}
        ${"a"} | ${"b"}
      `(
        "should fail when limit is $limit and offset is $offset",
        async ({ limit, offset }) => {
          const response = await requester.request(
            HttpRequest.GET("/path").query({ limit, offset }),
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

      const filterModel = RestCrudFilterMapFactory.build<Book>("all");

      @rest.resource(Book, "path")
      class BookResource implements RestResource<Book> {
        constructor(
          private db: Inject<orm.Database, "database">,
          private handler: RestCrudHandler,
        ) {}
        query(): orm.Query<Book> {
          return this.db.query(Book);
        }
        @rest.action("GET")
        async handle(
          filter: HttpQueries<InlineRuntimeType<typeof filterModel>>,
        ): Promise<RestCrudList<Book>> {
          return this.handler.list(this, {
            pagination: { limit: 10, offset: 0 },
            filter,
          });
        }
      }

      beforeEach(async () => {
        await prepare(BookResource, [Book, User]);
      });

      it.each`
        filter                             | total | items
        ${undefined}                       | ${3}  | ${[{ id: 1, owner: expect.any(Number) }, { id: 2, owner: expect.any(Number) }, { id: 3, owner: expect.any(Number) }]}
        ${"id[$eq]=1"}                     | ${1}  | ${[{ id: 1, owner: expect.any(Number) }]}
        ${"id[$gt]=1"}                     | ${2}  | ${[{ id: 2, owner: expect.any(Number) }, { id: 3, owner: expect.any(Number) }]}
        ${"owner[$eq]=1"}                  | ${1}  | ${[{ id: 1, owner: expect.any(Number) }]}
        ${"owner[$in][]=1"}                | ${1}  | ${[{ id: 1, owner: expect.any(Number) }]}
        ${"owner[$in][]=1&owner[$in][]=2"} | ${2}  | ${[{ id: 1, owner: expect.any(Number) }, { id: 2, owner: expect.any(Number) }]}
      `("should work with query $filter", async ({ filter, total, items }) => {
        const books = [new Book(), new Book(), new Book()];
        books.forEach((book) => (book.owner = new User()));
        await database.persist(...books);
        const request = HttpRequest.GET("/path");
        request["queryPath"] = filter;
        const response = await requester.request(request);
        expect(response.json).toEqual({ total, items });
      });
    });

    describe("Filter (deprecated)", () => {
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

      @rest.resource(User, "path")
      class UserResource implements RestResource<User> {
        constructor(
          private db: Inject<orm.Database, "database">,
          private handler: RestCrudHandler,
        ) {}
        query(): orm.Query<User> {
          return this.db.query(User);
        }
        @rest.action("GET")
        handle(filter: HttpQueries<RestCrudFilterMap<User>>) {
          return this.handler.list(this, {
            pagination: { limit: 10, offset: 0 },
            filter,
          });
        }
      }

      beforeEach(async () => {
        await prepare(UserResource, [User, Book]);
      });

      it.each`
        filter         | total | items
        ${undefined}   | ${3}  | ${[{ id: 1 }, { id: 2 }, { id: 3 }]}
        ${"id[$eq]=1"} | ${1}  | ${[{ id: 1 }]}
        ${"id[$gt]=1"} | ${2}  | ${[{ id: 2 }, { id: 3 }]}
      `("should work with query $filter", async ({ filter, total, items }) => {
        await database.persist(new User(), new User(), new User());
        const request = HttpRequest.GET("/path");
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

      @rest.resource(User, "path")
      class UserResource implements RestResource<User> {
        constructor(
          private db: Inject<orm.Database, "database">,
          private handler: RestCrudHandler,
        ) {}
        query(): orm.Query<User> {
          return this.db.query(User);
        }
        @rest.action("GET")
        handle(order: HttpQueries<RestCrudOrderMap<User>>) {
          return this.handler.list(this, {
            pagination: { limit: 10, offset: 0 },
            order,
          });
        }
      }

      beforeEach(async () => {
        await prepare(UserResource, [User, Book]);
      });

      it.each`
        order        | items
        ${{}}        | ${[{ id: 1 }, { id: 2 }]}
        ${"id=asc"}  | ${[{ id: 1 }, { id: 2 }]}
        ${"id=desc"} | ${[{ id: 2 }, { id: 1 }]}
      `("should work with query $order", async ({ order, items }) => {
        await database.persist(new User(), new User());
        const request = HttpRequest.GET("/path");
        request["queryPath"] = order;
        const response = await requester.request(request);
        expect(response.json).toEqual({ total: 2, items });
      });
    });
  });
});
