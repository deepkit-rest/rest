import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { Inject, InjectorContext } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";
import {
  AutoIncrement,
  BackReference,
  entity,
  PrimaryKey,
  Reference,
} from "@deepkit/type";
import { purify } from "src/common/type";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { RestActionContext } from "src/rest/core/rest-action";
import { RestModule } from "src/rest/rest.module";

import { rest } from "./core/rest.decorator";
import { RestResource } from "./core/rest-resource";
import { RestCrudService } from "./crud/rest-crud";
import { RestList } from "./crud/rest-list";
import {
  RestOffsetLimitPaginator,
  RestPaginationCustomizations,
} from "./crud/rest-pagination";
import { Filterable } from "./crud-models/rest-filter-map";
import { Orderable } from "./crud-models/rest-order-map";

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

  class MyEntity {
    id: number & AutoIncrement & PrimaryKey = 0;
  }
  @rest.resource(MyEntity, "api")
  class MyResource implements RestResource<MyEntity> {
    protected db!: Inject<orm.Database, "database">;
    protected crud!: Inject<RestCrudService>;
    query(): orm.Query<MyEntity> {
      return this.db.query(MyEntity);
    }
  }

  describe("List", () => {
    describe("Basic", () => {
      @rest.resource(MyEntity, "api")
      class TestingResource
        extends MyResource
        implements RestPaginationCustomizations
      {
        paginator!: Inject<RestOffsetLimitPaginator>;
        @rest.action("GET")
        list(context: RestActionContext) {
          return this.crud.list(context);
        }
      }
      it("should work", async () => {
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api"));
        expect(response.statusCode).toBe(200);
        expect(response.json).toEqual({
          total: 1,
          items: [{ id: 1 }],
        });
      });
    });

    describe("Pagination", () => {
      @rest.resource(MyEntity, "api")
      class TestingResource
        extends MyResource
        implements RestPaginationCustomizations
      {
        paginator!: Inject<RestOffsetLimitPaginator>;
        @rest.action("GET")
        list(context: RestActionContext) {
          return this.crud.list(context);
        }
      }

      beforeEach(async () => {
        await prepare(TestingResource, [MyEntity]);
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
            HttpRequest.GET("/api").query({ limit, offset }),
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
            HttpRequest.GET("/api").query({ limit, offset }),
          );
          expect(response.statusCode).toBe(400);
        },
      );
    });
  });

  // TODO: refactor tests below
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
        private crud: RestCrudService,
      ) {}
      query(): orm.Query<MyEntity> {
        return this.db.query(MyEntity).filter({ included: true });
      }
      lookup(raw: unknown): unknown {
        return raw === "first" ? 1 : purify<MyEntity["id"]>(raw);
      }
      @rest.action("GET")
      list(context: RestActionContext<MyEntity>): Promise<RestList<MyEntity>> {
        return this.crud.list(context);
      }

      @rest.action("GET").detailed()
      retrieve(context: RestActionContext<MyEntity>): Promise<MyEntity> {
        return this.crud.retrieve(context);
      }
    }

    beforeEach(async () => {
      await prepare(MyResource, [MyEntity]);
    });

    describe("Retrieve", () => {
      it("should work", async () => {
        await database.persist(new MyEntity(), new MyEntity(false));
        const response1 = await requester.request(HttpRequest.GET("/name/1"));
        expect(response1.statusCode).toBe(200);
        const response2 = await requester.request(HttpRequest.GET("/name/2"));
        expect(response2.statusCode).toBe(404);
      });
      it("should respect custom lookup resolving", async () => {
        await database.persist(new MyEntity(), new MyEntity());
        const response = await requester.request(
          HttpRequest.GET("/name/first"),
        );
        expect(response.statusCode).toBe(200);
        expect(response.json["id"]).toBe(1);
      });
    });
  });

  describe("Params", () => {
    describe("Filter", () => {
      @entity.name("user")
      class User {
        id: number & AutoIncrement & PrimaryKey = 0;
        books: Book[] & BackReference = [];
      }
      @entity.name("book")
      class Book {
        id: number & AutoIncrement & PrimaryKey & Filterable = 0;
        owner!: User & Reference & Filterable;
      }

      @rest.resource(Book, "path")
      class BookResource implements RestResource<Book> {
        constructor(
          private db: Inject<orm.Database, "database">,
          private crud: RestCrudService,
        ) {}
        query(): orm.Query<Book> {
          return this.db.query(Book);
        }
        @rest.action("GET")
        async handle(
          context: RestActionContext<Book>,
        ): Promise<RestList<Book>> {
          return this.crud.list(context);
        }
      }

      beforeEach(async () => {
        await prepare(BookResource, [Book, User]);
      });

      it.each`
        query                                              | total | items
        ${null}                                            | ${3}  | ${[{ id: 1, owner: expect.any(Number) }, { id: 2, owner: expect.any(Number) }, { id: 3, owner: expect.any(Number) }]}
        ${"filter[id][$eq]=1"}                             | ${1}  | ${[{ id: 1, owner: expect.any(Number) }]}
        ${"filter[id][$gt]=1"}                             | ${2}  | ${[{ id: 2, owner: expect.any(Number) }, { id: 3, owner: expect.any(Number) }]}
        ${"filter[owner][$eq]=1"}                          | ${1}  | ${[{ id: 1, owner: expect.any(Number) }]}
        ${"filter[owner][$in][]=1"}                        | ${1}  | ${[{ id: 1, owner: expect.any(Number) }]}
        ${"filter[owner][$in][]=1&filter[owner][$in][]=2"} | ${2}  | ${[{ id: 1, owner: expect.any(Number) }, { id: 2, owner: expect.any(Number) }]}
      `("should work with query $query", async ({ query, total, items }) => {
        const books = [new Book(), new Book(), new Book()];
        books.forEach((book) => (book.owner = new User()));
        await database.persist(...books);
        const request = HttpRequest.GET("/path");
        if (query) request["queryPath"] = query;
        const response = await requester.request(request);
        expect(response.json).toEqual({ total, items });
      });
    });

    describe("Order", () => {
      @entity.name("user")
      class User {
        id: number & AutoIncrement & PrimaryKey & Orderable = 0;
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
          private crud: RestCrudService,
        ) {}
        query(): orm.Query<User> {
          return this.db.query(User);
        }
        @rest.action("GET")
        handle(context: RestActionContext<User>) {
          return this.crud.list(context);
        }
      }

      beforeEach(async () => {
        await prepare(UserResource, [User, Book]);
      });

      it.each`
        query               | items
        ${null}             | ${[{ id: 1 }, { id: 2 }]}
        ${"order[id]=asc"}  | ${[{ id: 1 }, { id: 2 }]}
        ${"order[id]=desc"} | ${[{ id: 2 }, { id: 1 }]}
      `("should work with query $query", async ({ query, items }) => {
        await database.persist(new User(), new User());
        const request = HttpRequest.GET("/path");
        if (query) request["queryPath"] = query;
        const response = await requester.request(request);
        expect(response.json).toEqual({ total: 2, items });
      });
    });
  });
});
