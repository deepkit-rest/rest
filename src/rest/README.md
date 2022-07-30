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

> The `Query` object returned from `getQuery()` will be the base `Query` for every CRUD Actions, so it's a good place to filter the entities to restrict what the user can view. For example you can allow the user to view only his own `Book`:
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

| Action   | Example URL     | Available Customizations             |
| -------- | --------------- | ------------------------------------ |
| List     | GET /books      | Serialization, Pagination, Filtering |
| Create   | POST /books     | Serialization                        |
| Retrieve | GET /books/1    | Serialization, Retrieving            |
| Update   | PATCH /books/1  | Serialization, Retrieving            |
| Delete   | DELETE /books/1 | Retrieving                           |

> You can extend the built-in CRUD Kernel for more functionalities:
>
> ```ts
> class AppCrudKernel extends RestCrudKernel {
>   async createMany(): Promise<Response> {
>     // ...
>   }
> }
> ```

## Entity Pagination

An Entity Paginator plays an important role in List Actions. It's responsible for both applying pagination to the `Query` object and forming the response body.

The paginator to use can be specified by implementing `RestPaginationCustomizations`:

```ts
class BookResource implements RestResource<Book>, RestPaginationCustomizations {
  readonly paginator = RestPageNumberPaginator;
  // ...
}
```

```ts
interface RestPaginationCustomizations {
  paginator?: ClassType<RestEntityPaginator>;
}
```

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

## Entity Serialization

As entities must be serialized to form the response, serialization is a necessary part of every CRUD Actions, which is handled by Entity Serializers.

The serializer to use can be specified by implementing `RestSerializationCustomizations`:

```ts
class BookResource
  implements RestResource<Book>, RestSerializationCustomizations<Book>
{
  readonly serializer = BookSerializer;
  // ...
}
```

While the "serialization" and the "deserialization" for Entity Serializers are a little different from the ones in other scenarios:

```ts
export interface RestEntitySerializer<Entity> {
  /**
   * Transform the entity into a JSON serializable plain object to form the
   * response body.
   * @param entity
   */
  serialize(entity: Entity): Promise<unknown>;
  /**
   * Create a new entity instance based on the payload data which came
   * from the request body.
   * @param payload
   */
  deserializeCreation(payload: Record<string, unknown>): Promise<Entity>;
  /**
   * Update an existing entity instance based on the payload data which came
   * from the request body.
   * @param payload
   */
  deserializeUpdate(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity>;
}
```

## RestGenericSerializer

`RestGenericSerializer` is the default Entity Serializer, with the ability to handle the serialization and deserialization of any entities.

### Serialization

In serialization, `RestGenericSerializer` directly leverages DeepKit's built-in serialization feature. It is also compatible with the `@http.serialization()` and `@http.serializer()` decorators, which means you can customize the serialization behavior just as how you do in regular HTTP Controllers:

```ts
@rest.action("GET")
@http.serialization({ groupsExclude: ["hidden"] })
action() {}
```

### Deserialization for Creation

In deserialization for creations, `RestGenericSerializer` will first purify(deserialize and validate) the payload against a schema generated from the entity schema based on the fields decorated with `InCreation` using DeepKit's deserialization feature:

> For `Reference` fields, DeepKit deserialization will automatically transform primary keys into entity references. But `BackReference` fields are not supported.

Let's say entity `Book` is defined like this:

```ts
class Book {
  id: UUID & PrimaryKey = uuid();
  name: string & MaxLength<50> & InCreation;
}
```

The payload will be purified against a schema like this:

```ts
interface GeneratedSchema {
  name: string & MaxLength<50>;
}
```

> Generated schemas will be cached and reused.

Then, `RestGenericSerializer` will instantiate a new entity instance, and assign the data from the purified payload to the entity instance:

```ts
const book = await serializer.deserializeCreation({ name: "name" });
book instanceof Book; // true
book.name === "name"; // true
```

By default `RestGenericSerializer` requires the entity constructor to take no parameters, because it's impossible to know what argument to pass. An error will be thrown if `entityClass.length !== 0`. But you can customize how new entities are instantiated by overriding its `createEntity()` method where the purified payload will be passed as a parameter:

```ts
class BookSerializer extends RestGenericSerializer<Book> {
  protected override createEntity(data: Partial<Book>) {
    return new Book(data.title, data.author);
  }
}
```

You can also modify the `data` object to assign values to fields like `owner` when overriding `createEntity()`:

```ts
protected override createEntity(data: Partial<Book>) {
  const userId = this.requestContext.userId;
  const user = this.database.getRef(User, userId);
  data.owner = user;
  return super.createEntity(data);
}
```

### Deserialization for Update

Just like how it behaves in deserialization for creations, `RestGenericSerializer` will purify the request payload against a generated schema, but now the schema is generated based on fields decorated with `InUpdate`:

```ts
class Book {
  name: ... & InUpdate;
  // ...
}
```

And then the data will be assigned to an existing entity instead of a new one:

```ts
book = await serializer.deserializeUpdate(book, { name: "updated" });
book.name === "updated"; // true
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

## Entity Filtering

In List Actions, the `Query` object will be processed by Entity Filters before passing to the Entity Paginator. It's the best place to modify the query result dynamically based on the request.

By default there are no Entity Filters in use. We can specify multiple Entity Filters, and they will be invoked one by one in order:

```ts
class BookResource implements RestResource<Book>, RestFilteringCustomizations {
  readonly filters = [RestGenericFilter, RestGenericSorter];
  // ...
}
```

### RestGenericFilter

`RestGenericFilter` allows the client to filter entities through the `filter` query param (by default) for specified fields:

```
?filter[owner][$eq]=1&filter[name][$in][]=name1&filter[name][$in][]=name2
```

> Supported filter operators are: `["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"]`.

Decorate a field with `Filterable` to enable filtering:

```ts
class Book {
  id: ... & Filterable;
}
```

> `BackReference` fields are not yet supported.

The query parameter name can be specified via the `param` configuration property:

```ts
class AppFilter extends RestGenericFilter {
  override param = "filter"; // default value
  // ...
}
```

### RestGenericSorter

`RestGenericSorter` is a special Entity Filter which enables client-controlled sorting against specified fields through the `order` query param (by default):

```
?order[id]=asc&order[name]=desc
```

Decorate a field with `Orderable` to enable sorting:

```ts
class Book {
  id: ... & Orderable;
}
```

Configuration properties are similar to `RestGenericFilter`:

```ts
class AppSorter extends RestGenericSorter {
  override param = "order"; // default value
  // ...
}
```

## Retrieving

For every entity-specific Actions(e.g. Retrieve, Update, Delete), it's necessary to retrieve the target entity for further operations, which is mostly handled by an Entity Retriever.

The Entity Retriever to use can be specified by implementing `RestRetrievingCustomizations`:

```ts
class BookResource implements RestResource<Book>, RestRetrievingCustomizations {
  readonly retriever = RestSingleFieldRetriever;
  // ...
}
```

### RestSingleFieldRetriever

`RestSingleFieldRetriever` is the default Entity Retriever, which retrieves the entity based on the `:pk` path parameter and the entity's primary key(by default):

```ts
@rest.action("GET", ":pk")
async retrieve(): Promise<Response> {
  return this.crud.retrieve();
}
```

Its behavior can be customized by implementing `RestSingleFieldRetrieverCustomizations` and specify the `retrievesOn` property:

The `retrievesOn` property have a simple form and a long form:

```ts
@rest.resource(Book).lookup("anything")
class BookResource
  implements
    RestResource<Book>,
    RestRetrievingCustomizations,
    RestSingleFieldRetrieverCustomizations<Book>
{
  readonly retriever = RestSingleFieldRetriever;
  readonly retrievesOn = "id"; // simple form
  readonly retrievesOn = "identity->username"; // long form
  // ...
}
```

- In the example of the simple form, the value of the path parameter `:id` will be used to retrieve the entity on its `id` field.
- In the example of the long form, the value of the path parameter `:identity` will be used to retrieve the entity on its `username` field.

## CRUD Action Context

When not using the CRUD Kernel, DeepKit REST can still bring you huge convenience via CRUD Action Context, which is a provider in `http` scope allowing us to easily access a lot of contextual information:

```ts
constructor(private crudContext: RestCrudActionContext) {}
@rest.action("PUT", ":pk/")
customAction() {
  const entity = await this.crudContext.getEntity(); // uses the Entity Retriever
  const resource = this.crudContext.getResource();
};
```

You can call the `getXxx()` methods of CRUD Action Context as many times as you want without worrying the performance, because there is a caching system implemented for CRUD Action Context to cache and reuse results.

CRUD Action Context will be available once `httpWorkflow.onRoute` event is finished. Thus you can also use it in Event Listeners.

## Resource Inheritance

As the application grows, you'll find that there are a lot of repeated patterns like the paginator declaration and completely same `getDatabase()` code. To keep DRY, you can create an abstract `AppResource` as the base Resource:

```ts
export abstract class AppResource<Entity>
  implements
    RestResource<Entity>,
    RestPaginationCustomizations,
    RestFilteringCustomizations
{
  paginator = RestOffsetLimitPaginator;
  filters = [RestGenericFilter, RestGenericSorter];

  protected database: Inject<Database>;

  getDatabase(): Database {
    return this.database;
  }

  abstract getQuery(): Query<Entity>;
}
```

# Special Thanks

- [Django REST Framework](https://www.django-rest-framework.org/) for inspiration
- [Marc J. Schmidt](https://github.com/marcj) for developing DeepKit and helping me understanding DeepKit
