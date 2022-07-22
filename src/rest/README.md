# Deepkit REST

REST API simplified

> Inspired by: [Django REST Framework](https://www.django-rest-framework.org/)

# Installation

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

DeepKit REST is divided into multiple decoupled parts, which allows you to easily extend its functionalities. The Core part provides a few concepts that fits well with REST API use cases.

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

To include our resource in a module, simply declare it in `controllers` of the module:

```ts
class BookModule extends createModule({
  controllers: [BookResource],
}) {}
```

You can basically regard a Resource as a special Controller, as Resources are in `http` scope and everything that works in regular HTTP Controllers works in REST Resources.

The following code will generate a route at `/api/v1/books/:id`, where `api` is the the default API prefix, `v` is the default versioning prefix, and `books` is the path of the Resource inferred from the entity's collection name because we didn't manually specify a path:

```ts
@entity.name("book").collection("books")
class Book {
  // ...
}

@rest.resource(Book).version(1)
class BookResource implements RestResource<Book> {
  // ...
  @http.GET(":id")
  async route(id: string) {}
}
```

> `v1` will not appear if Resource is not decorated using `@rest.version()` or versioning is disabled.

The API prefix and versioning prefix can be configured when instantiating `RestModule`:

```ts
// custom prefix
new RestModule({ prefix: "api-prefix", versioning: "versioning-prefix" });
// remove API prefix and disable versioning
new RestModule({ prefix: "", versioning: false });
```

And Resource path can be manually specified via:

```ts
@rest.resource(Book, "my-books")
```

> It would cause an error if there is no path specified for the resource and also no collection name specified for the entity.

## Action

Regular HTTP Actions/Routes are replaced by REST Actions(Action for short).

Actions can be defined using the combination of the new `@rest` decorator and the regular `@http` decorator.

```ts
@rest.action("GET")
@http.group('auth-required')
action() {}
```

> You MUST NOT define Actions using ONLY the `@http` decorator, which means you should avoid decorations like `@http.GET()` and `@http.POST()` because this would make the Action a regular HTTP Action rather than a REST Action and most features of this library are not available for a regular HTTP Action.

Actions can be "detailed":

```ts
@rest.action("GET").detailed()
```

Detailed Actions are actions performed on a specific entity, thus will be suffixed with a path parameter, which is `:pk` by default. The path parameter name can be customized via `@rest.lookup()`:

```ts
@rest.resource(Book).lookup("id")
```

Actions can also have additional custom path suffixed:

```ts
@rest.action("GET").detailed().path('suffixed-path')
```

## Action Context

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

> All methods in Action Context have caching implemented, so there's nothing to worry when calling a method multiple times.

# CRUD

The CRUD part provides a highly customizable workflow for CRUD operations built on top of the Core Concepts.

To get start with CRUD, we need to first inject the CRUD Kernel into our Resource.

```ts
class BookResource implements RestResource<Book> {
  constructor(private crud: RestCrudKernel) {}
  // ...
}
```

## Entity Serializer

As entities must be serialized into plain objects to form the response, all the CRUD Actions will make use of an Entity Serializer.

```ts
interface RestEntitySerializer<Entity> {
  serialize(entity: Entity): Promise<unknown>;
  // ...
}
```

The default Entity Serializer is `RestGenericSerializer` which internally uses DeepKit's serialization feature. When using `RestGenericSerializer`, you can specify the DeepKit serialization options and the DeepKit serializer to use via the `@http` decorator:

```ts
@http.serializer(serializer).serialization({ groupsExclude: ["hidden"] })
```

You can extend the `RestGenericSerializer` or implement your own Entity Serializer to customize the behavior:

```ts
class BookResource
  implements RestResource<Book>, RestSerializationCustomizations<Book>
{
  serializer = BookSerializer;
  // ...
}
```

## List Action

Now let's first implement a simplest List Action:

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
?filter[owner][$eq]=1&filter[name][$in]=name1&filter[name][$in]=name2
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
@rest.action("GET").detailed()
retrieve(): Promise<Response> {
  return this.crud.retrieve();
}
```

The behavior of Retrieve Action completely depends on the Entity Retriever in use:

```ts
class BookResource implements RestResource<Book>, RestRetrievingCustomizations {
  retriever = RestFieldBasedRetriever;
  // ...
}
```

### RestFieldBasedRetriever

`RestFieldBasedRetriever` is the default Entity Retriever, which retrieves the entity based on the `lookup` metadata of the Resource:

- If the metadata value is `pk`, the entity will be retrieved on its primary key: `lookup: pk` + `GET /books/1` -> `{ id: 1 }`
- If the metadata value matches the name of one of the entities fields, the entity will be retrieved on the field: `lookup: name` + `GET /books/MyBook` -> `{ name: "MyBook" }`
- If the metadata value doesn't match any of the cases above, an error is caused unless `retrievesOn` is specified (explained later)

> The value of the `lookup` metadata of a Resource is specified via `@rest.lookup()`.  
> The default value is `pk`.

If you think that this approach is not type-safe, or you just don't want to bind the `lookup` metadata with the field to retrieve on, there is another approach for you to specify the field:

```ts
@rest.resource(Book).lookup("anything")
class BookResource
  implements
    RestResource<Book>,
    RestRetrievingCustomizations,
    RestFieldBasedRetrieverCustomizations<Book>
{
  retriever = RestFieldBasedRetriever;
  retrievesOn = "id";
  // ...
}
```

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

> Caching system is shared by all derived classes of Action Context, which means invoking a `getXxx()` in both Action Context and CRUD Action Context will not cause any redundant calculations.
