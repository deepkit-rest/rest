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

Before we get started, let's first get familiar with our core concepts.

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

We have to implement the required methods here to provide context for other advanced features of the library such as automated CRUD.

`getQuery()` is a good place for you to limit what the user can view. For example you can limit the user to view only his own `Book`:

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

You can basically regard a Resource as a special Controller. Everything that works in a regular Controller also works in a Resource.

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

Assume that `Book` is annotated like this:

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

Note that you MUST NOT define Actions using ONLY the `@http` decorator, which means you should avoid decorations like `@http.GET()` and `@http.POST`. This would make the Action a regular HTTP Action rather than a REST Action and most features of this library are not available for a regular HTTP Action.

We can also define Detailed Actions:

```ts
@rest.action("GET").detailed()
retrieve(pk: string) {
  return "something";
}
```

Detailed Actions are basically Actions with a path parameter suffixed, which is `:pk` by default, but some features are available only for detailed actions.

The path parameter name can be customized when decorating the Resource:

```ts
@rest.action
```
