# Deepkit Http Extension

Extension of `@deepkit/http` package.

# Usage

Import `HttpExtensionModule` in the root module.

```ts
new App({
  imports: [
    new HttpExtensionModule(),
    //...
  ],
}).run();
```

# API

## Informative Injectables

Additional providers is provided in the `http` scope.

### HttpInjectorContext

The `InjectorContext` instance of the current `http` scope. Can be used to dynamically inject providers in `http` scope.

```ts
@http.controller()
class MyController {
  constructor(
    private injector: HttpInjectorContext,
    private module: InjectorModule,
  ) {}
  @http.GET()
  route() {
    const service = this.injector.get(MyService, module);
  }
}
```

### HttpRouteConfig

Information about the current route.

```ts
@http.controller("base-url")
class MyController {
  constructor(private routeConfig: HttpRouteConfig) {}
  @http.GET("path")
  route() {
    console.debug(this.routeConfig.getFullPath()); // "base-url/path"
  }
}
```

### HttpControllerMeta

Metadata of the current http controller class.

> Available only for class-based routes.

```ts
@http.controller("base-url")
class MyController {
  constructor(private controllerMeta: HttpControllerMeta) {}
  @http.GET()
  route() {
    console.debug(this.controllerMeta.baseUrl); // "base-url"
  }
}
```

### HttpActionMeta

Metadata of the current http routing method.

> Available only for class-based routes.

```ts
@http.controller()
class MyController {
  constructor(private actionMeta: HttpActionMeta) {}
  @http.GET()
  route() {
    console.debug(this.actionMeta.methodName); // "route"
  }
}
```

## Services

### HttpRequestParser

Allow dynamic request parsing during the request handling process.

TODO: details

### HttpRequestContext

Higher-level wrapper of `HttpRequestParser` with caching and type validation support.

TODO: details

### HttpRangeParser

Simple parser of http header `Range`.

TODO: details
