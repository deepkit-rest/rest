import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest, RouteConfig, Router } from "@deepkit/http";
import { Inject, InjectorContext, ProviderWithScope } from "@deepkit/injector";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import {
  AutoIncrement,
  entity,
  PrimaryKey,
  ValidationError,
} from "@deepkit/type";

import { RestConfig } from "./rest.config";
import { rest } from "./rest.decorator";
import {
  ResolvedRestActionHandler,
  RestActionHandler,
  RestActionHandlerContext,
  RestResource,
} from "./rest.interfaces";
import { RestModule } from "./rest.module";

describe("REST", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: orm.Database;

  async function setup(
    config: Partial<RestConfig>,
    controllers: ClassType<RestResource<any>>[],
    providers: ProviderWithScope[] = [],
  ) {
    facade = createTestingApp({
      imports: [new RestModule(config)],
      controllers,
      providers: [
        {
          provide: "DATABASE",
          useValue: new orm.Database(new orm.MemoryDatabaseAdapter()),
        },
        ...providers,
      ],
    });
    requester = facade.app.get(HttpKernel);
    database = facade.app.get(InjectorContext).get<orm.Database>("DATABASE");
    await database.migrate();
    // temporary workaround: transport setup is not working, so we have to
    // manually set it up
    facade.app.get(Logger).setTransport([new MemoryLoggerTransport()]);
    await facade.startServer();
  }

  @entity.name("user").collection("users")
  class User {
    id: number & PrimaryKey & AutoIncrement = 0;
  }

  class UserRestResource implements RestResource<User> {
    constructor(private database: Inject<orm.Database, "DATABASE">) {}
    query(): orm.Query<User> {
      return this.database.query(User);
    }
  }

  test("routing (inferred from entity collection name)", async () => {
    @rest.resource(User).lookup("id")
    class TestingResource extends UserRestResource {
      @rest.action("POST")
      route1() {}
      @rest.action("GET").detailed()
      route2() {}
      @rest.action("DELETE").suffix("suffix")
      route3() {}
      @rest.action("PATCH").detailed().suffix("suffix")
      route4() {}
    }
    await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
    const routes = facade.app.get(Router).getRoutes();
    expect(routes).toMatchObject<Partial<RouteConfig>[]>([
      { baseUrl: "prefix/users", path: "", httpMethods: ["POST"] },
      { baseUrl: "prefix/users", path: ":id", httpMethods: ["GET"] },
      { baseUrl: "prefix/users", path: "suffix", httpMethods: ["DELETE"] },
      { baseUrl: "prefix/users", path: ":id/suffix", httpMethods: ["PATCH"] },
    ]);
  });

  test("routing (explicitly specified)", async () => {
    @rest.resource(User, "name").lookup("id")
    class TestingResource extends UserRestResource {
      @rest.action("GET")
      route1() {}
    }
    await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
    const routes = facade.app.get(Router).getRoutes();
    expect(routes).toMatchObject<Partial<RouteConfig>[]>([
      { baseUrl: "prefix/name", path: "", httpMethods: ["GET"] },
    ]);
  });

  test("routing (versioning)", async () => {
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
    const routes = facade.app.get(Router).getRoutes();
    expect(routes).toMatchObject<Partial<RouteConfig>[]>([
      { baseUrl: "prefix/v1/name", path: "", httpMethods: ["GET"] },
      { baseUrl: "prefix/v2/name", path: "", httpMethods: ["POST"] },
    ]);
  });

  test("parameter resolving", async () => {
    @rest.resource(User).lookup("id")
    class TestingResource extends UserRestResource {
      @rest.action("GET").detailed()
      retrieve(lookup: User["id"], target: User, request: HttpRequest) {
        expect(target).toBeInstanceOf(User);
        expect(lookup).toBe(target.id);
        expect(request).toBeDefined();
      }
    }
    await setup({ prefix: "prefix", versioning: false }, [TestingResource]);
    await database.persist(new User());
    const response = await requester.request(
      HttpRequest.GET("/prefix/users/1"),
    );
    expect(response.statusCode).toBe(200);
  });

  test("action handler", async () => {
    let context!: RestActionHandlerContext;
    class TestingActionHandler implements RestActionHandler {
      handle(ctx: RestActionHandlerContext) {
        context = ctx;
      }
    }

    @rest.resource(User)
    class TestingResource extends UserRestResource {
      @rest.action("POST").useHandler(TestingActionHandler)
      action(handler: ResolvedRestActionHandler) {
        return handler();
      }
    }

    await setup(
      { prefix: "prefix", versioning: false },
      [TestingResource],
      [TestingActionHandler],
    );

    const response = await requester.request(
      HttpRequest.POST("/prefix/users")
        .json({ key1: "v1" })
        .query({ key2: "v2" }),
    );
    expect(response.statusCode).toBe(200);
    expect(context.parseBody<any>()).toEqual({ key1: "v1" });
    expect(context.parseQueries<any>()).toEqual({ key2: "v2" });
    expect(() => {
      context.parseBody<{ key1: number }>();
    }).toThrow(ValidationError);
    expect(() => {
      context.parseQueries<{ key2: number }>();
    }).toThrow(ValidationError);
  });
});
