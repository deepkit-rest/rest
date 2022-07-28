import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import {
  http,
  HttpKernel,
  HttpRequest,
  HttpRouter,
  HttpUnauthorizedError,
  RouteConfig,
} from "@deepkit/http";
import { Inject, ProviderWithScope } from "@deepkit/injector";
import { Database, MemoryDatabaseAdapter, Query } from "@deepkit/orm";
import { AutoIncrement, entity, PrimaryKey } from "@deepkit/type";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";

import { RestActionContext } from "./core/rest-action";
import { rest } from "./core/rest-decoration";
import { RestGuard } from "./core/rest-guard";
import { RestResource } from "./core/rest-resource";
import { RestModuleConfig } from "./rest.config";
import { RestModule } from "./rest.module";

describe("REST Core", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;

  async function setup(
    config: Partial<RestModuleConfig>,
    controllers: ClassType[],
    providers: ProviderWithScope[] = [],
  ) {
    facade = createTestingApp({
      imports: [new HttpExtensionModule(), new RestModule(config)],
      controllers,
      providers: [
        {
          provide: Database,
          useValue: new Database(new MemoryDatabaseAdapter()),
        },
        ...providers,
      ],
    });
    requester = facade.app.get(HttpKernel);
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
      await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
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
      await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/users", httpMethods: ["GET"] },
      ]);
    });

    test("versioning", async () => {
      @rest.resource(User, "api").version(1)
      class TestingResourceV1 extends UserRestResource {
        @rest.action("GET")
        route1() {}
      }
      @rest.resource(User, "api").version(2)
      class TestingResourceV2 extends UserRestResource {
        @rest.action("POST")
        route1() {}
      }
      await setup({ prefix: "prefix", versioning: "v" }, [
        TestingResourceV1,
        TestingResourceV2,
      ]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/v1/api", httpMethods: ["GET"] },
        { baseUrl: "", path: "prefix/v2/api", httpMethods: ["POST"] },
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
      await setup({ prefix: "prefix", versioning: false }, [MyResource]);
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
    await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
    await database.persist(new User());
    const response = await requester.request(HttpRequest.GET("/prefix/api"));
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
      { prefix: "prefix", versioning: false },
      [MyResource],
      [{ provide: Dep, scope: "http" }],
    );
    await expect(promise).resolves.toBeUndefined();
    await requester.request(HttpRequest.GET("/prefix/api"));
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
        { prefix: "prefix", versioning: false },
        [MyResource],
        [{ provide: MyGuard, scope: "http" }],
      );
      const response = await requester.request(HttpRequest.GET("/prefix/api"));
      expect(response.statusCode).toBe(401);
    });

    test("action scoped", async () => {
      @rest.resource(User, "api")
      class MyResource extends UserRestResource {
        @rest.action("GET").guardedBy(MyGuard)
        route() {}
      }
      await setup(
        { prefix: "prefix", versioning: false },
        [MyResource],
        [{ provide: MyGuard, scope: "http" }],
      );
      const response = await requester.request(HttpRequest.GET("/prefix/api"));
      expect(response.statusCode).toBe(401);
    });
  });
});
