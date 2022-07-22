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

You can basically regard a Resource as a special Controller, as Resources are in `http` scope and everything that works in regular HTTP Controllers works in REST Resources.

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

All methods in Action Context have caching implemented, so there's nothing to worry about for calling a method multiple times.

# CRUD

The CRUD part provides a highly customizable workflow for CRUD operations built on top of the Core Concepts.

To get start with CRUD, we need to first inject the CRUD Kernel into our Resource.

```ts
class BookResource implements RestResource<Book> {
  constructor(private crud: RestCrudKernel) {}
  // ...
}
```

## List

Let's implement a simplest List Action:

```ts
@rest.action("GET")
list(): Promise<Response> {
  return this.crud.list();
}
```

This simplest List Action has no pagination, no filtering, no sorting support. It simply return a

```json
{
  "total": ...,
  "items": [...]
}
```

where `items` is all the entities that can be queries using the `Query` object return by the `getQuery()` method implemented in the Resource.

### Pagination

The default paginator `RestNoopPaginator` won't do any processing to the `Query` object. There are two other built-in paginator implementations: `RestOffsetLimitPaginator` and `RestPageNumberPaginator`. To enable advanced pagination, we need to specify the paginator we want to use:

```ts
class BookResource implements RestResource<Book>, RestPaginationCustomizations {
  paginator = RestOffsetLimitPaginator;
  // ...
}
```

### RestOffsetLimitPaginator

By default, `RestOffsetLimitPaginator` paginates the List result based on the `limit` and `offset` query params and returns a `{ total: ..., items: [...] }` object as the response body.

You can customize its behavior by overriding its configuration properties or directly overriding methods:

```ts
class AppPaginator extends RestOffsetLimitPaginator {
  override limitDefault = 30;
  override limitMax = 50;
  override limitParam = "limit";
  override offsetMax = 1000;
  override offsetParam = "offset";

  override processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    return super.processQuery(query);
  }

  override buildBody(
    items: () => Promise<unknown[]>,
    total: () => Promise<number>,
  ): Promise<unknown> {
    return super.buildBody(items, total);
  }
}
```

### RestPageNumberPaginator

`RestPageNumberPaginator` performs pagination based on the `page` and `size` query params by default and also returns a `{ total: ..., items: [...] }` object as the response body.

Customizations are also available by overriding class members:

```ts
class AppPaginator extends RestPageNumberPaginator {
  override pageNumberMax = 20;
  override pageNumberParam = "page";
  override pageSizeDefault = 30;
  override pageSizeMax = 50;
  override pageSizeParam = "size";
  // ...
}
```

## Filtering

By default no user-controlled filtering is allowed. We can only filter entities in the `getQuery()` method of the Resource. User-controlled filtering can be enabled by specifying the filters we'd like to use:

```ts
class BookResource implements RestResource<Book>, RestFilteringCustomizations {
  filters = [RestGenericFilter];
  // ...
}
```

### RestGenericFilter

The built-in `RestGenericFilter` allows the user to filter the entities by specifying the `filter` query param:

```
?filter[owner][$eq]=1&filter[name][$in]=name1&filter[name][$in]=name2
```

Supported filter operators are: `["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"]`.

By default `RestGenericFilter` doesn't allow user-controlled filtering on any fields. To enable filtering on a specific field, we need to add a `Filterable` Type Decorator to the field:

```ts
class Book {
  id: ... & Filterable;
}
```

Note that `OneToMany` and `ManyToMany` relational fields are not yet supported. Basically relational fields with an `Array` type are not supported.

We can customize its behavior by extending and overriding class members:

```ts
class AppFilter extends RestGenericFilter {
  override param = "filter";
  // ...
}
```

## Sorting

User-controlled sorting can be enabled by specifying the sorters:

```ts
class BookResource implements RestResource<Book>, RestSortingCustomizations {
  sorters = [RestGenericSorter];
  // ...
}
```

### RestGenericSorter

`RestGenericSorter` allows user-controlled sorting based on the query param `order` by default:

```
?order[id]=asc&order[name]=desc
```

Sorting is enabled for only the fields decorated with `Orderable`:

```ts
class Book {
  id: ... & Orderable;
}
```

Behavior can be customized by extending the class:

```ts
class AppSorter extends RestGenericSorter {
  override param = "order";
  // ...
}
```
