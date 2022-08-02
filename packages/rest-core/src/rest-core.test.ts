import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import {
  http,
  HttpRequest,
  HttpRouter,
  HttpUnauthorizedError,
  RouteConfig,
} from "@deepkit/http";
import { Inject, ProviderWithScope } from "@deepkit/injector";
import { Database, MemoryDatabaseAdapter, Query } from "@deepkit/orm";
import { AutoIncrement, entity, PrimaryKey } from "@deepkit/type";
import { HttpExtensionModule } from "@deepkit-rest/http-extension";

import { RestActionContext } from "./rest-action";
import { RestCoreModule } from "./rest-core";
import { RestCoreModuleConfig } from "./rest-core-config";
import { rest } from "./rest-decoration";
import { RestGuard } from "./rest-guard";
import { RestResource } from "./rest-resource";

describe("REST Core", () => {
  let facade: TestingFacade<App<any>>;
  let database: Database;

  async function setup(
    config: Partial<RestCoreModuleConfig>,
    controllers: ClassType[],
    providers: ProviderWithScope[] = [],
  ) {
    facade = createTestingApp({
      imports: [new HttpExtensionModule(), new RestCoreModule(config)],
      controllers,
      providers: [
        {
          provide: Database,
          useValue: new Database(new MemoryDatabaseAdapter()),
        },
        ...providers,
      ],
    });
    database = facade.app.get(Database);
    await database.migrate();
    await facade.startServer();
  }

  @entity.name("user").collection("users")
  class User {
    id: number & PrimaryKey & AutoIncrement = 0;
  }

  class UserRestResource implements RestResource<User> {
    constructor(private database: Database) {}
    getDatabase(): Database {
      return this.database;
    }
    getQuery(): Query<User> {
      return this.database.query(User);
    }
  }

  describe("Routing", () => {
    test("basic", async () => {
      @rest.resource(User, "api")
      class TestingResource extends UserRestResource {
        @rest.action("POST")
        route1() {}
        @rest.action("GET", "path")
        route2() {}
      }
      await setup({ prefix: "prefix" }, [TestingResource]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/api", httpMethods: ["POST"] },
        { baseUrl: "", path: "prefix/api/path", httpMethods: ["GET"] },
      ]);
    });

    test("inferred resource path", async () => {
      @rest.resource(User)
      class TestingResource extends UserRestResource {
        @rest.action("GET")
        route1() {}
      }
      await setup({ prefix: "prefix" }, [TestingResource]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/users", httpMethods: ["GET"] },
      ]);
    });

    test("@http", async () => {
      @rest.resource(User, "api")
      class MyResource extends UserRestResource {
        @http.GET("http")
        action1() {}
        @rest.action("POST", "rest")
        @http.group("test")
        action2() {}
      }
      await setup({ prefix: "prefix" }, [MyResource]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toHaveLength(2);
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/api/http", httpMethods: ["GET"] },
        {
          baseUrl: "",
          path: "prefix/api/rest",
          httpMethods: ["POST"],
          groups: ["test"],
        },
      ]);
    });
  });

  test("action context", async () => {
    let assertion!: () => void;
    @rest.resource(User, "api")
    class TestingResource extends UserRestResource {
      private context!: Inject<RestActionContext>;
      @rest.action("GET")
      retrieve(context: RestActionContext) {
        assertion = () => {
          expect(context).toBe(this.context);
          expect(context).toBeInstanceOf(RestActionContext);
        };
      }
    }
    await setup({ prefix: "prefix" }, [TestingResource]);
    await database.persist(new User());
    const response = await facade.request(HttpRequest.GET("/prefix/api"));
    expect(response.statusCode).toBe(200);
    assertion();
  });

  test("http scope injection", async () => {
    @rest.resource(User, "api")
    class MyResource extends UserRestResource {
      constructor(private dep: Dep, database: Database) {
        super(database);
      }

      @rest.action("GET")
      route() {}
    }
    class Dep {}
    const promise = setup(
      { prefix: "prefix" },
      [MyResource],
      [{ provide: Dep, scope: "http" }],
    );
    await expect(promise).resolves.toBeUndefined();
    await facade.request(HttpRequest.GET("/prefix/api"));
  });

  describe("Guard", () => {
    class MyGuard implements RestGuard {
      async guard(): Promise<void> {
        throw new HttpUnauthorizedError();
      }
    }

    test("resource scoped", async () => {
      @rest.resource(User, "api").guardedBy(MyGuard)
      class MyResource extends UserRestResource {
        @rest.action("GET")
        route() {}
      }
      await setup(
        { prefix: "prefix" },
        [MyResource],
        [{ provide: MyGuard, scope: "http" }],
      );
      const response = await facade.request(HttpRequest.GET("/prefix/api"));
      expect(response.statusCode).toBe(401);
    });

    test("action scoped", async () => {
      @rest.resource(User, "api")
      class MyResource extends UserRestResource {
        @rest.action("GET").guardedBy(MyGuard)
        route() {}
      }
      await setup(
        { prefix: "prefix" },
        [MyResource],
        [{ provide: MyGuard, scope: "http" }],
      );
      const response = await facade.request(HttpRequest.GET("/prefix/api"));
      expect(response.statusCode).toBe(401);
    });
  });
});
