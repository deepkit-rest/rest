# Deepkit REST

**_REST API simplified._**

```
npm i deepkit-rest // not available now :D
```

# Overview

DeepKit REST opens up a whole new declarative and extensive approach for developing REST APIs where

- request information is available also via the dependency injection system instead of only available through controller method parameters.
- request is parsed dynamically and progressively during the responding process by different services instead of parsed at once by the framework based on the schemas defined ahead of time
- response body is completely serialized and formed by ourselves

By adopting this approach, we can now create elegant general abstractions for common logic much more easily, and thus we can implement our API like this:

```ts
@rest.resource(Book, "books").guardedBy(AuthGuard)
export class BookResource
  implements
    RestResource<Book>,
    RestPaginationCustomizations,
    RestFilteringCustomizations,
    RestSortingCustomizations,
    RestSerializationCustomizations<Book>
{
  readonly serializer = BookSerializer;
  readonly paginator = RestOffsetLimitPaginator;
  readonly filters = [RestGenericFilter];
  readonly sorters = [RestGenericSorter];

  constructor(
    private database: Database,
    private requestContext: RequestContext,
    private crud: RestCrudKernel<Book>,
  ) {}

  getDatabase(): Database {
    return this.database;
  }

  getQuery(): Query<Book> {
    const userId = this.requestContext.user.id;
    const userRef = this.database.getReference(User, userId);
    return this.database.query(Book).filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["internal"] })
  async list(): Promise<Response> {
    return this.crud.list();
  }
}
```

# Tutorial

To get started, both `RestModule` and `HttpExtensionModule` are required to be imported in your `App` instance:

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

> `HttpExtensionModule` plays an important role in DeepKit REST by making the request information available through the DI system where the most useful provider `HttpRequestParsed` in the module offers us the ability to parse the request at any time during a responding process:
>
> ```ts
> class MyService {
>   constructor(private request: HttpRequestParsed) {}
>   method() {
>     interface DynamicQuerySchema {}
>     const queries = this.request.getQueries<DynamicQuerySchema>();
>   }
> }
> ```

## Resource

In DeepKit REST, we define Resources instead of HTTP Controllers:

```ts
@rest.resource(Book, "base/path/for/book/actions")
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

> `getQuery()` is a good place to filter the entities that the user can view. For example you can allow the user to view only his own `Book`:
>
> ```ts
> getQuery() {
>     const userId = this.somehowGetUserId()
>     const userRef = this.database.getRef(User, userId);
>     return this.database.query(Book).filter({ owner: userRef });
> }
> ```

To include our resource in a module, simply declare it in `controllers` of the module:

```ts
class BookModule extends createModule({
  controllers: [BookResource],
}) {}
```

### Actions

Despite of a few internal differences, Resources are just special HTTP Controllers:

- Resources are in `http` scope too
- `@http` decorators still work in Resources
- Method parameters are resolved completely the same
- ...

Therefore, you should be able to use decorators like `@http.GET()` to define Actions, but you should NEVER do, because it will probably make the Action a regular HTTP Action but not a REST Action, and most of our features not available to regular HTTP Actions.

Instead, an Action should be defined using `@rest.action()`:

```ts
@rest.action("GET", ":id")
```

As long as `@rest.action()` is applied, you can use the `@http` decorator for additional metadata:

```ts
@rest.action("GET", ":id")
@http.group("my-group").data("key", "value").response(404)
```

### Inferred Path

For simple resources, we can omit the second parameter of `@rest.resource()` to infer the resource's path from the entity's collection name:

```ts
@entity.name("book").collection("books")
class Book {
  // ...
}
```

```ts
@rest.resource(Book) // inferred path: "books"
class BookResource implements RestResource<Book> {
  // ...
}
```

### Path Prefix

We can specify the path prefix for all our resources via the module config of `RestModule`

```ts
{
  imports: [new RestModule({ prefix: "api" })];
}
```

### Nested Resources

There is a notable difference in route generation between Resources and HTTP Controllers - routes generated from Resources will never have a `baseUrl`. Therefore, we can declare path parameter in the Resource path, and thus we can have nested Resources:

```ts
@rest.resource(Book, "users/:userId/books")
class UserBookResource implements RestResource<Book> {
  constructor(private request: HttpRequestParsed, private database: Database) {}
  // ...
  getQuery() {
    const { userId } = this.request.getPathParams<{ userId: string }>();
    const userRef = this.database.getRef(User, userId);
    return this.database.query(Book).filter({ owner: userRef });
  }
  // ...
}
```

## CRUD Kernel

In order to respond to a CRUD Action, we'll need to invoke multiple REST components in a fixed order(e.g. for list actions: query -> filter -> paginator -> sorter -> serializer -> response):

For convenience, workflows of most common CRUD Actions have been wrapped and are available for you via the CRUD Kernel. The public methods of CRUD Kernel never take any parameters, all the information are obtained from the DI system. Usually, all we need to do is just to invoke the CRUD Kernel and return the result:

```ts
constructor(private crud: RestCrudKernel) {}
@rest.action("GET")
async list(): Promise<Response> {
  return this.crud.list();
}
```

The responsibility of CRUD Kernel is only to call the REST components in order. Its behavior completely depends on the REST components in use. We can specify which REST component to use by implementing customization interfaces:

```ts
@rest.resource(Book, "books")
class BookResource implements RestResource<Book>, RestPaginationCustomizations {
  readonly paginator = RestPageNumberPaginator;
  constructor(private crud: RestCrudKernel) {}
  // ...
  @rest.action("GET")
  async list(): Promise<Response> {
    return this.crud.list();
  }
}
```

| Action   | Available Customizations                      |
| -------- | --------------------------------------------- |
| List     | Serialization, Pagination, Filtering, Sorting |
| Create   | Serialization                                 |
| Retrieve | Serialization, Retrieving                     |
| Update   | Serialization, Retrieving                     |
| Delete   | Retrieving                                    |

> You can extend the built-in CRUD Kernel for more functionalities:
>
> ```ts
> class AppCrudKernel extends RestCrudKernel {
>   async createMany(): Promise<Response> {
>     // ...
>   }
> }
> ```

## Pagination

Paginators are responsible for applying pagination to the `Query` object and forming the response body.

### RestNoopPaginator

`RestNoopPaginator` is the default paginator the CRUD Kernel uses, which doesn't do any processing to the `Query` and thus will return as many entities as available, and form the body like:

```
{
  total: ...,
  items: [...],
}
```

### RestOffsetLimitPaginator

By default, `RestOffsetLimitPaginator` paginates the List result based on the `limit` and `offset` query params and form the body the same: `{ total: ..., items: [...] }`.

Some configuration properties are available for you to customize its behavior by overriding the value:

```ts
class AppPaginator extends RestOffsetLimitPaginator {
  // these are the default values
  override limitDefault = 30;
  override limitMax = 50;
  override limitParam = "limit";
  override offsetMax = 1000;
  override offsetParam = "offset";
}
```

### RestPageNumberPaginator

`RestPageNumberPaginator` performs pagination based on the `page` and `size` query params by default and also form a `{ total: ..., items: [...] }` object as the response body.

Customizations are also available by overriding configuration properties:

```ts
class AppPaginator extends RestPageNumberPaginator {
  // these are the default values
  override pageNumberMax = 20;
  override pageNumberParam = "page";
  override pageSizeDefault = 30;
  override pageSizeMax = 50;
  override pageSizeParam = "size";
}
```

<!-- ## Action Context

Action Context is provided in `http` scope, offering easy access to a lot of information about the current Resource and Action that might be used during a REST API responding process.

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

> Most methods in Action Context have caching implemented, so there's nothing to worry if you want to call a method multiple times.

# Developing REST APIs

The responding process of a REST API is separated into multiple REST components with their own responsibilities, such as REST Paginator and REST Filter, and there are quite a lot implementations of these REST components built in this library covering common CRUD use cases.

## List Action

Let's first implement a simplest List Action:

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

where `items` is all the entities that can be queried using the `Query` object returned from the `getQuery()` method implemented in the Resource.

### Pagination

The default Entity Paginator `RestNoopPaginator` won't do any processing to the `Query` object, but there are two other Entity Paginators implemented for you: `RestOffsetLimitPaginator` and `RestPageNumberPaginator`. To enable advanced pagination, we need to specify the Entity Paginator we want to use:

```ts
class BookResource implements RestResource<Book>, RestPaginationCustomizations {
  paginator = RestOffsetLimitPaginator;
  // ...
}
```

#### RestOffsetLimitPaginator

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

#### RestPageNumberPaginator

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

### Filtering

By default no user-controlled filtering is available. We can only filter entities in the `getQuery()` method of the Resource. User-controlled filtering can be enabled by specifying the Entity Filters we'd like to use:

```ts
class BookResource implements RestResource<Book>, RestFilteringCustomizations {
  filters = [RestGenericFilter];
  // ...
}
```

#### RestGenericFilter

The built-in `RestGenericFilter` allows the user to filter the entities by specifying the `filter` query param:

```
?filter[owner][$eq]=1&filter[name][$in][]=name1&filter[name][$in][]=name2
```

> Supported filter operators are: `["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"]`.

By default `RestGenericFilter` doesn't allow user-controlled filtering on any fields. To enable filtering on a specific field, we need to add a `Filterable` Type Decorator to the field:

```ts
class Book {
  id: ... & Filterable;
}
```

> `OneToMany` and `ManyToMany` relational fields are not yet supported. Basically relational fields with an `Array` type are not supported.

We can customize its behavior by extending and overriding its class members:

```ts
class AppFilter extends RestGenericFilter {
  override param = "filter";
  // ...
}
```

### Sorting

User-controlled sorting can be enabled by specifying the Entity Sorters:

```ts
class BookResource implements RestResource<Book>, RestSortingCustomizations {
  sorters = [RestGenericSorter];
  // ...
}
```

#### RestGenericSorter

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

## Retrieve Action

A Retrieve Action can be implemented like this:

```ts
@rest.action("GET", ":pk")
retrieve(): Promise<Response> {
  return this.crud.retrieve();
}
```

The behavior of Retrieve Action completely depends on the Entity Retriever in use:

```ts
class BookResource implements RestResource<Book>, RestRetrievingCustomizations {
  retriever = RestSingleFieldRetriever;
  // ...
}
```

### RestSingleFieldRetriever

`RestSingleFieldRetriever` is the default Entity Retriever, which retrieves the entity based on the `:pk` path parameter and the entity's primary key by default.

Its behavior can be customized by implementing the `retrievesOn` property of the `RestSingleFieldRetrieverCustomizations` interface:

The `retrievesOn` property have a simple form and a long form:

```ts
@rest.resource(Book).lookup("anything")
class BookResource
  implements
    RestResource<Book>,
    RestRetrievingCustomizations,
    RestSingleFieldRetrieverCustomizations<Book>
{
  retriever = RestSingleFieldRetriever;
  retrievesOn = "id"; // simple form
  retrievesOn = "identity->username"; // long form
  // ...
}
```

- In the example of the simple form, the value of the path parameter `:id` will be used to retrieve the entity on its `id` field.
- In the example of the long form, the value of the path parameter `:identity` will be used to retrieve the entity on its `username` field.

## Delete Action

Delete Action basically remove the entity retrieved by the Entity Retriever, so its behavior is also decided by the Entity Retriever used.

```ts
@rest.action("DELETE").detailed()
delete(): Promise<Response> {
  return this.crud.delete();
}
```

## Create Action

A Create Action's implementation is similar too:

```ts
@rest.action("POST")
create(): Promise<Response> {
  return this.crud.create();
}
```

Most customizations can be implemented by customizing the Entity Serializer in use:

```ts
interface RestEntitySerializer<Entity> {
  deserializeCreation(payload: Record<string, unknown>): Promise<unknown>;
  // ...
}
```

### RestGenericSerializer

In a Create Action, `RestGenericSerializer` will purify(deserialize and validate) the request payload against a schema generated from the entity based on fields decorated with `InCreation`, and then assign the payload values to a new entity instance.

> During the deserialization, DeepKit will automatically transform primary keys into entity references for fields decorated with `Reference`.

Let's say `Book` is defined like this:

```ts
class Book {
  id: UUID & PrimaryKey = uuid();
  name: string & MaxLength<50> & InCreation;
}
```

Then the request payload for the Create Action will be purified against a schema like this:

```ts
interface GeneratedSchema {
  name: string & MaxLength<50>;
}
```

By default `RestGenericSerializer` requires the entity constructor to take no parameters because it's impossible to know what argument to pass. An error will be thrown if `entityClass.length !== 0`. But you can customize how new entities are instantiated by overriding its `createEntity()` method where the purified payload will be passed as a parameter:

```ts
class BookSerializer extends RestGenericSerializer<Book> {
  protected override createEntity(data: Partial<Book>) {
    return new Book(data.title, data.author);
  }
}
```

You can also modify the `data` to assign values to fields like `owner` when overriding `createEntity()`:

```ts
protected override createEntity(data: Partial<Book>) {
  const userId = this.requestContext.userId;
  const user = this.database.getRef(User, userId);
  data.owner = user;
  return super.createEntity(data);
}
```

## Update Action

The implementation is as simple as ever:

```ts
@rest.action("PATCH").detailed()
update(): Promise<Response> {
  return this.crud.update();
}
```

Update Actions' behavior depends on both the Entity Serializer and the Entity Retriever. It basically uses the Entity Serializer to deserialize the request payload to update the entity retrieved by the Entity Retriever:

```ts
interface RestEntitySerializer<Entity> {
  deserializeUpdate(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity>;
  // ...
}
```

### RestGenericSerializer

Just like how it behaves in a Create Action, `RestGenericSerializer` purify the request payload against a generated schema, but now the schema is generated based on fields decorated with `InUpdate`:

```ts
class Book {
  name: ... & InUpdate;
  // ...
}
```

To customize how entities are updated, you can override the `updateEntity()` method, which is a good place to assign values to fields like `updatedAt`:

```ts
class BookSerializer extends RestGenericSerializer<Book> {
  protected override updateEntity(entity: Book, data: Partial<Book>) {
    data.updatedAt = new Date();
    return super.updateEntity(entity, data);
  }
}
```

## Keeping DRY via Inheritance

As the application grows, you'll find that there are a lot of repeated patterns like the paginator declaration and completely same `getDatabase()` code. To keep DRY, you can create an abstract `AppResource` as the base Resource:

```ts
export abstract class AppResource<Entity>
  implements
    RestResource<Entity>,
    RestPaginationCustomizations,
    RestFilteringCustomizations,
    RestSortingCustomizations
{
  paginator = RestOffsetLimitPaginator;
  filters = [RestGenericFilter];
  sorters = [RestGenericSorter];

  protected database: Inject<Database>;

  getDatabase(): Database {
    return this.database;
  }

  abstract getQuery(): Query<Entity>;
}
```

## Leveraging CRUD Features in Custom Actions

In Actions other than the ones supported by the CRUD Kernel, we can still make use of these CRUD Features via CRUD Action Context.

CRUD Action Context is derived from [Action Context](#action-context), where additional contextual information is available for you:

```ts
constructor(private crudContext: RestCrudActionContext) {}
@rest.action("PUT").detailed().path("custom-action")
customAction() {
  // retrieve the entity using the Entity Retriever
  // (available for only detailed actions)
  const entity = await this.crudContext.getEntity();
  // the return type is overridden to include all customization interfaces
  const resource = this.crudContext.getResource();
};
```

> Caching system is shared by all derived classes of Action Context, which means invoking a `getXxx()` in both Action Context and CRUD Action Context will not cause any redundant calculations. -->

# Special Thanks

- [Django REST Framework](https://www.django-rest-framework.org/) for inspiration
- [Marc J. Schmidt](https://github.com/marcj) for developing DeepKit and helping me understanding DeepKit
