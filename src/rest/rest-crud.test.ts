import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { Inject, InjectorContext, ProviderWithScope } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";
import { AutoIncrement, PrimaryKey, Reference } from "@deepkit/type";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { RestActionContext } from "src/rest/core/rest-action";
import { RestModule } from "src/rest/rest.module";

import { rest } from "./core/rest-decoration";
import { RestResource } from "./core/rest-resource";
import { RestCrudService, RestList } from "./crud/rest-crud";
import {
  RestFilteringCustomizations,
  RestGenericFilter,
} from "./crud/rest-filtering";
import {
  RestOffsetLimitPaginator,
  RestPaginationCustomizations,
} from "./crud/rest-pagination";
import {
  RestFieldBasedRetriever,
  RestFieldBasedRetrieverCustomizations,
  RestRetriever,
  RestRetrievingCustomizations,
} from "./crud/rest-retrieving";
import {
  RestGenericSorter,
  RestSortingCustomizations,
} from "./crud/rest-sorting";
import { Filterable } from "./crud-models/rest-filter-map";
import { Orderable } from "./crud-models/rest-order-map";

describe("REST CRUD", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: orm.Database;

  async function prepare<Entity>(
    resource: ClassType<RestResource<Entity>>,
    entities: ClassType[] = [],
    providers: ProviderWithScope[] = [],
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
        ...providers,
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
    constructor(public name: string = "") {}
  }
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
        paginator = RestOffsetLimitPaginator;
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
          items: [{ id: 1, name: expect.any(String) }],
        });
      });
    });

    describe("Pagination", () => {
      describe("RestLimitOffsetPaginator", () => {
        @rest.resource(MyEntity, "api")
        class TestingResource
          extends MyResource
          implements RestPaginationCustomizations
        {
          paginator = RestOffsetLimitPaginator;
          @rest.action("GET")
          list(context: RestActionContext): Promise<RestList<MyEntity>> {
            return this.crud.list(context);
          }
        }

        beforeEach(async () => {
          await prepare(TestingResource, [MyEntity]);
        });

        it.each`
          limit | offset | items
          ${1}  | ${1}   | ${[{ id: 2, name: expect.any(String) }]}
          ${1}  | ${0}   | ${[{ id: 1, name: expect.any(String) }]}
          ${2}  | ${1}   | ${[{ id: 2, name: expect.any(String) }, { id: 3, name: expect.any(String) }]}
          ${1}  | ${2}   | ${[{ id: 3, name: expect.any(String) }]}
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

    describe("Filtering", () => {
      describe("RestGenericFilter", () => {
        class Entity1 {
          id: number & AutoIncrement & PrimaryKey & Filterable = 0;
          ref!: Entity2 & Reference & Filterable;
        }
        class Entity2 {
          id: number & AutoIncrement & PrimaryKey = 0;
        }
        @rest.resource(Entity1, "api")
        class TestingResource
          implements RestResource<Entity1>, RestFilteringCustomizations
        {
          filters = [RestGenericFilter];
          constructor(
            private database: Inject<orm.Database, "database">,
            private crud: RestCrudService,
          ) {}
          query(): orm.Query<Entity1> {
            return this.database.query(Entity1);
          }
          @rest.action("GET")
          list(context: RestActionContext): Promise<RestList<Entity1>> {
            return this.crud.list(context);
          }
        }

        beforeEach(async () => {
          await prepare(TestingResource, [Entity1, Entity2]);
        });

        it.each`
          query                                          | total | items
          ${null}                                        | ${3}  | ${[{ id: 1, ref: expect.any(Number) }, { id: 2, ref: expect.any(Number) }, { id: 3, ref: expect.any(Number) }]}
          ${"filter[id][$eq]=1"}                         | ${1}  | ${[{ id: 1, ref: expect.any(Number) }]}
          ${"filter[id][$gt]=1"}                         | ${2}  | ${[{ id: 2, ref: expect.any(Number) }, { id: 3, ref: expect.any(Number) }]}
          ${"filter[ref][$eq]=1"}                        | ${1}  | ${[{ id: 1, ref: expect.any(Number) }]}
          ${"filter[ref][$in][]=1"}                      | ${1}  | ${[{ id: 1, ref: expect.any(Number) }]}
          ${"filter[ref][$in][]=1&filter[ref][$in][]=2"} | ${2}  | ${[{ id: 1, ref: expect.any(Number) }, { id: 2, ref: expect.any(Number) }]}
        `("should work with query $query", async ({ query, total, items }) => {
          const entities = new Array(3).fill(1).map(() => new Entity1());
          entities.forEach((entity) => (entity.ref = new Entity2()));
          await database.persist(...entities);
          const request = HttpRequest.GET("/api");
          if (query) request["queryPath"] = query;
          const response = await requester.request(request);
          expect(response.json).toEqual({ total, items });
        });
      });
    });

    describe("Sorting", () => {
      describe("RestGenericSorter", () => {
        class TestingEntity {
          id: number & AutoIncrement & PrimaryKey & Orderable = 0;
        }
        @rest.resource(TestingEntity, "api")
        class TestingResource implements RestSortingCustomizations {
          sorters = [RestGenericSorter];
          constructor(
            private database: Inject<orm.Database, "database">,
            private crud: RestCrudService,
          ) {}
          query(): orm.Query<TestingEntity> {
            return this.database.query(TestingEntity);
          }
          @rest.action("GET")
          list(context: RestActionContext<TestingEntity>) {
            return this.crud.list(context);
          }
        }

        beforeEach(async () => {
          await prepare(TestingResource, [TestingEntity]);
        });

        it.each`
          query               | items
          ${null}             | ${[{ id: 1 }, { id: 2 }]}
          ${"order[id]=asc"}  | ${[{ id: 1 }, { id: 2 }]}
          ${"order[id]=desc"} | ${[{ id: 2 }, { id: 1 }]}
        `("should work with query $query", async ({ query, items }) => {
          await database.persist(new TestingEntity(), new TestingEntity());
          const request = HttpRequest.GET("/api");
          if (query) request["queryPath"] = query;
          const response = await requester.request(request);
          expect(response.json).toEqual({ total: 2, items });
        });
      });
    });
  });

  describe("Retrieve", () => {
    describe("Basic", () => {
      @rest.resource(MyEntity, "api").lookup("id")
      class TestingResource extends MyResource {
        @rest.action("GET").detailed()
        retrieve(context: RestActionContext) {
          return this.crud.retrieve(context);
        }
      }
      it("should work", async () => {
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/1"));
        expect(response.statusCode).toBe(200);
      });
    });

    describe("RestFieldBasedRetriever", () => {
      test("lookup name as target field", async () => {
        @rest.resource(MyEntity, "api").lookup("id")
        class TestingResource
          extends MyResource
          implements RestRetrievingCustomizations
        {
          retriever = RestFieldBasedRetriever;
          @rest.action("GET").detailed()
          retrieve(context: RestActionContext) {
            return this.crud.retrieve(context);
          }
        }
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/1"));
        expect(response.json).toMatchObject({ id: 1 });
      });

      test("primary key as target field", async () => {
        @rest.resource(MyEntity, "api").lookup("invalidFieldName")
        class TestingResource
          extends MyResource
          implements RestRetrievingCustomizations
        {
          retriever = RestFieldBasedRetriever;
          @rest.action("GET").detailed()
          retrieve(context: RestActionContext) {
            return this.crud.retrieve(context);
          }
        }
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/1"));
        expect(response.json).toMatchObject({ id: 1 });
      });

      test("custom field as target field", async () => {
        @rest.resource(MyEntity, "api").lookup("id")
        class TestingResource
          extends MyResource
          implements
            RestRetrievingCustomizations,
            RestFieldBasedRetrieverCustomizations<MyEntity>
        {
          readonly retriever = RestFieldBasedRetriever;
          readonly retrievesOn = "name";
          @rest.action("GET").detailed()
          retrieve(context: RestActionContext) {
            return this.crud.retrieve(context);
          }
        }
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity("name"));
        const response = await requester.request(HttpRequest.GET("/api/name"));
        expect(response.json).toMatchObject({ id: 1 });
      });
    });

    describe("Custom Lookup", () => {
      @rest.resource(MyEntity, "api").lookup("test")
      class TestingResource
        extends MyResource
        implements RestRetrievingCustomizations
      {
        retriever = TestingLookupBackend;
        @rest.action("GET").detailed()
        retrieve(context: RestActionContext) {
          return this.crud.retrieve(context);
        }
      }
      class TestingLookupBackend implements RestRetriever {
        retrieve<Entity>(
          context: RestActionContext<any>,
          query: orm.Query<Entity>,
        ): orm.Query<Entity> {
          return query.addFilter("id" as any, 1);
        }
      }

      it("should work", async () => {
        await prepare(
          TestingResource,
          [MyEntity],
          [{ provide: TestingLookupBackend, scope: "http" }],
        );
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/any"));
        expect(response.statusCode).toBe(200);
        expect(response.json["id"]).toBe(1);
      });
    });
  });
});
