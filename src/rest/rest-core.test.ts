import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import {
  http,
  HttpKernel,
  HttpRequest,
  HttpRouter,
  RouteConfig,
} from "@deepkit/http";
import { Inject, InjectorContext, ProviderWithScope } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import { Database, MemoryDatabaseAdapter, Query } from "@deepkit/orm";
import { AutoIncrement, entity, PrimaryKey } from "@deepkit/type";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";

import { RestActionContext } from "./core/rest-action";
import { rest, restClass } from "./core/rest-decoration";
import { RestActionMeta, RestMetaConfigurator } from "./core/rest-meta";
import { RestResource } from "./core/rest-resource";
import { RestConfig } from "./rest.config";
import { RestModule } from "./rest.module";

describe("REST Core", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;

  async function setup(
    config: Partial<RestConfig>,
    controllers: ClassType<RestResource<any>>[],
    providers: ProviderWithScope[] = [],
  ) {
    facade = createTestingApp({
      imports: [new HttpExtensionModule(), new RestModule(config)],
      controllers,
      providers: [
        {
          provide: "DATABASE",
          useValue: new Database(new MemoryDatabaseAdapter()),
        },
        ...providers,
      ],
    });
    requester = facade.app.get(HttpKernel);
    database = facade.app.get(InjectorContext).get<Database>("DATABASE");
    await database.migrate();
    facade.app.get(Logger).setTransport([new MemoryLoggerTransport()]); // temporary workaround: transport setup is not working, so we have to manually set it up
    await facade.startServer();
  }

  @entity.name("user").collection("users")
  class User {
    id: number & PrimaryKey & AutoIncrement = 0;
  }

  class UserRestResource implements RestResource<User> {
    constructor(private database: Inject<Database, "DATABASE">) {}
    query(): Query<User> {
      return this.database.query(User);
    }
  }

  describe("Routing", () => {
    test("inferred resource name from entity collection name", async () => {
      @rest.resource(User).lookup("id")
      class TestingResource extends UserRestResource {
        @rest.action("POST")
        route1() {}
        @rest.action("GET").detailed()
        route2() {}
        @rest.action("DELETE").path("suffix")
        route3() {}
        @rest.action("PATCH").detailed().path("suffix")
        route4() {}
      }
      await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/users", httpMethods: ["POST"] },
        { baseUrl: "", path: "prefix/users/:id", httpMethods: ["GET"] },
        { baseUrl: "", path: "prefix/users/suffix", httpMethods: ["DELETE"] },
        {
          baseUrl: "",
          path: "prefix/users/:id/suffix",
          httpMethods: ["PATCH"],
        },
      ]);
    });

    test("explicitly specified resource name", async () => {
      @rest.resource(User, "name").lookup("id")
      class TestingResource extends UserRestResource {
        @rest.action("GET")
        route1() {}
      }
      await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/name", httpMethods: ["GET"] },
      ]);
    });

    test("versioning", async () => {
      @rest.resource(User, "name").lookup("id").version(1)
      class TestingResourceV1 extends UserRestResource {
        @rest.action("GET")
        route1() {}
      }
      @rest.resource(User, "name").lookup("id").version(2)
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
        { baseUrl: "", path: "prefix/v1/name", httpMethods: ["GET"] },
        { baseUrl: "", path: "prefix/v2/name", httpMethods: ["POST"] },
      ]);
    });

    test("@http", async () => {
      @rest.resource(User)
      class MyResource extends UserRestResource {
        @http.GET("http")
        action1() {}
        @rest.action("POST")
        @http.group("test")
        action2() {}
      }
      await setup({ prefix: "prefix", versioning: false }, [MyResource as any]);
      const routes = facade.app.get(HttpRouter).getRoutes();
      expect(routes).toHaveLength(2);
      expect(routes).toMatchObject<Partial<RouteConfig>[]>([
        { baseUrl: "", path: "prefix/users/http", httpMethods: ["GET"] },
        { baseUrl: "", path: "prefix/users", httpMethods: ["POST"] },
      ]);
    });

    test("nesting", async () => {
      @entity.name("parent").collection("parents")
      class Parent {}
      @entity.name("child").collection("children")
      class Child {}

      {
        @rest.resource(Parent)
        class ParentResource {
          @rest.action("GET").detailed() route() {}
        }
        @rest.resource(Child).parent(ParentResource as any)
        class ChildResource {
          @rest.action("GET").detailed() route() {}
        }
        await setup({ prefix: "prefix", versioning: false }, [
          ParentResource as any,
          ChildResource as any,
        ]);
        const routes = facade.app.get(HttpRouter).getRoutes();
        expect(routes).toHaveLength(2);
        expect(routes).toMatchObject<Partial<RouteConfig>[]>([
          { path: "prefix/parents/:pk" },
          { path: "prefix/parents/:parentPk/children/:pk" },
        ]);
      }

      {
        @rest.resource(Parent).version(1)
        class ParentResource {
          @rest.action("GET").detailed() route() {}
        }
        @rest.resource(Child).version(2)
        @rest.parent(ParentResource as any)
        class ChildResource {
          @rest.action("GET").detailed() route() {}
        }
        await setup({ prefix: "prefix", versioning: "v" }, [
          ParentResource as any,
          ChildResource as any,
        ]);
        const routes = facade.app.get(HttpRouter).getRoutes();
        expect(routes).toHaveLength(2);
        expect(routes).toMatchObject<Partial<RouteConfig>[]>([
          { path: "prefix/v1/parents/:pk" },
          { path: "prefix/v2/parents/:parentPk/children/:pk" },
        ]);
      }
    });
  });

  test("parameter resolving", async () => {
    let assertion!: () => void;

    @rest.resource(User).lookup("id")
    class TestingResource extends UserRestResource {
      @rest.action("GET").detailed()
      retrieve(context: RestActionContext, request: HttpRequest) {
        assertion = () => {
          expect(context).toBeInstanceOf(RestActionContext);
          expect(request).toBeDefined();
        };
      }
    }
    await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
    await database.persist(new User());
    const response = await requester.request(
      HttpRequest.GET("/prefix/users/1"),
    );
    expect(response.statusCode).toBe(200);
    assertion();
  });

  test("meta configurator", async () => {
    class MyConfigurator implements RestMetaConfigurator<RestActionMeta> {
      configure(meta: RestActionMeta): void {
        meta.path = "v2";
      }
    }
    @rest.resource(User)
    class MyResource extends UserRestResource {
      @rest.action("GET").useConfigurator(new MyConfigurator()).path("v1")
      action() {}
    }
    expect(restClass._fetch(MyResource)?.actions?.["action"].path).toBe("v1");
    await setup({ prefix: "prefix", versioning: false }, [MyResource]);
    expect(restClass._fetch(MyResource)?.actions?.["action"].path).toBe("v2");
  });

  test("http scope injection", async () => {
    @rest.resource(User)
    class MyResource extends UserRestResource {
      constructor(private dep: Dep, database: Inject<Database, "DATABASE">) {
        super(database);
      }

      @rest.action("GET")
      route() {}
    }
    class Dep {}
    const promise = setup(
      { prefix: "prefix", versioning: false },
      [MyResource as any],
      [{ provide: Dep, scope: "http" }],
    );
    await expect(promise).resolves.toBeUndefined();
    await requester.request(HttpRequest.GET("/prefix/users"));
  });
});
