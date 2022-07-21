# Deepkit REST

REST API simplified

> Inspired by: [Django REST Framework](https://www.django-rest-framework.org/)

# Prerequisites

DeepKit REST allows you to implement RESTful APIs in a declarative but also flexible and extensive way.

To begin with DeepKit REST, both `RestModule` and `HttpExtensionModule` should be imported in your `App` instance.

```ts
new App({
  imports: [
    new FrameworkModule(),
    new HttpExtensionModule(),
    new RestModule(),
    // ...
  ],
})
  .loadConfigFromEnv()
  .run();
```

# Core Concepts

DeepKit REST is divided into multiple decoupled parts. The Core part provides a few concepts that fits well with REST API use cases.

## Resource

In DeepKit REST, we define REST Resources(Resource for short) instead of HTTP Controllers:

```ts
@rest.resource(Book)
class BookResource implements RestResource<Book> {
  constructor(private database: Database) {}

  getDatabase() {
    return this.database;
  }

  getQuery() {
    return this.database.query(Book);
  }
}
```

`getQuery()` is a good place to filter the entities that the user can view. For example you can allow the user to view only his own `Book`:

```ts
getQuery() {
    const userId = this.somehowGetUserId()
    const userRef = this.database.getRef(User, userId);
    return this.database.query(Book).filter({ owner: userRef });
}
```

To include our resource in a module, simply put it into `controllers` of the module's declaration:

```ts
class BookModule extends createModule({
  controllers: [BookResource],
}) {}
```

You can basically regard a Resource as a special Controller, as everything that works in regular HTTP Controllers work in REST Resources too.

```ts
@rest.resource(Book)
class BookResource implements RestResource<Book> {
  constructor(private database: Database, private crud: RestCrudKernel) {}
  // ...
  @http.GET(":id")
  async retrieve(id: string): Promise<Book> {
    return this.getQuery().filter({ id }).findOne();
  }
}
```

Let's assume that `Book` is annotated like this:

```ts
@entity.name("book").collection("books")
class Book {
  // ...
}
```

Then the code above would generate a route at `/api/books/:id`, where `api` is the the default global prefix which can be configured in the configuration of `RestModule`, and `books` is the collection name of the entity `Book`.

We can also manually specify a path for our `BookResource`:

```ts
@rest.resource(Book, "my-books")
```

Note that it would cause an error if there is no path specified for the resource and also no collection name specified for the entity.

## Action

Regular HTTP Actions/Routes are replaced by REST Actions(Action for short).

Actions can be defined using the combination of the new `@rest` decorator and the regular `@http` decorator.

```ts
@rest.action("GET")
@http.group('auth-required')
action() {}
```

Note that you MUST NOT define Actions using ONLY the `@http` decorator, which means you should avoid decorations like `@http.GET()` and `@http.POST()`, which would make the Action a regular HTTP Action rather than a REST Action and most features of this library are not available for a regular HTTP Action.

An Action can be a Detailed Action:

```ts
@rest.action("GET").detailed()
retrieve() {
  return "something";
}
```

Detailed Actions are Actions with a path parameter suffixed, which is `:pk` by default.

The path parameter name can be customized when decorating the Resource:

```ts
@rest.resource(Book).lookup("id")
```

The decoration above will make Detailed Actions suffixed with a `:id` path parameter.

## Action Context

Action Context is a provider provided in `http` scope which offers a lot of information about the current Resource and Action that might be used during a REST API responding process.

```ts
class MyService {
  constructor(private context: RestActionContext) {}
  method() {
    const resource = this.context.getResource();
    const entitySchema = this.context.getEntitySchema();
    // ...
  }
}
```
