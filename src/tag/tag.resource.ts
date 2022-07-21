import { http } from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import { Database, Query } from "@deepkit/orm";
import { RequestContext } from "src/core/request-context";
import { AppEntitySerializer, AppResource } from "src/core/rest";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { rest } from "src/rest/core/rest-decoration";
import { ResponseReturnType, RestCrudKernel } from "src/rest/crud/rest-crud";
import { RestSerializationCustomizations } from "src/rest/crud/rest-serialization";
import { User } from "src/user/user.entity";

import { Tag } from "./tag.entity";

@rest.resource(Tag).lookup("id")
export class TagResource
  extends AppResource<Tag>
  implements RestSerializationCustomizations<Tag>
{
  readonly serializer = TagSerializer;

  constructor(
    database: Database,
    private context: RequestContext,
    private databaseSession: InjectDatabaseSession,
    private crud: RestCrudKernel<Tag>,
  ) {
    super(database);
  }

  getQuery(): Query<Tag> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.databaseSession.query(Tag).filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(): Promise<ResponseReturnType> {
    return this.crud.list();
  }

  @rest.action("POST")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async create(): Promise<ResponseReturnType> {
    return this.crud.create();
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(): Promise<ResponseReturnType> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(): Promise<ResponseReturnType> {
    return this.crud.update();
  }

  @rest.action("DELETE").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async delete(): Promise<ResponseReturnType> {
    return this.crud.delete();
  }
}

export class TagSerializer extends AppEntitySerializer<Tag> {
  protected database!: InjectDatabaseSession;
  protected requestContext!: Inject<RequestContext>;
  protected override createEntity(data: Partial<Tag>): Tag {
    const userId = this.requestContext.user.id;
    data.owner = this.database.getReference(User, userId);
    return super.createEntity(data);
  }
}
