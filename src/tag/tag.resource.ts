import { http, HttpBody } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { NoContentResponse } from "src/http-extension/http-common";
import { RestActionContext } from "src/rest/core/rest-action";
import { rest } from "src/rest/core/rest-decoration";
import { RestResource } from "src/rest/core/rest-resource";
import { RestCrudService, RestList } from "src/rest/crud/rest-crud";
import {
  RestFilteringCustomizations,
  RestGenericFilter,
} from "src/rest/crud/rest-filtering";
import {
  RestOffsetLimitPaginator,
  RestPaginationCustomizations,
} from "src/rest/crud/rest-pagination";
import {
  RestGenericSorter,
  RestSortingCustomizations,
} from "src/rest/crud/rest-sorting";
import { User } from "src/user/user.entity";

import { Tag } from "./tag.entity";

@rest.resource(Tag).lookup("id")
export class TagResource
  implements
    RestResource<Tag>,
    RestPaginationCustomizations,
    RestFilteringCustomizations,
    RestSortingCustomizations
{
  readonly paginator = RestOffsetLimitPaginator;
  readonly filters = [RestGenericFilter];
  readonly sorters = [RestGenericSorter];

  constructor(
    private context: RequestContext,
    private database: InjectDatabaseSession,
    private crud: RestCrudService,
  ) {}

  query(): orm.Query<Tag> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.database.query(Tag).filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(context: RestActionContext): Promise<RestList<Tag>> {
    return this.crud.list(context);
  }

  @rest.action("POST")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async create(payload: HttpBody<TagCreationPayload>): Promise<Tag> {
    const owner = this.database.getReference(User, this.context.user.id);
    const tag = new Tag({ ...payload, owner });
    this.database.add(tag);
    // temporary workaround: serialization result is different between manually
    // instantiated entities and queried entities, so we have to retrieve it
    // again from the database
    await this.database.flush();
    this.database.identityMap.clear();
    return this.query().filter({ id: tag.id }).findOne();
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(context: RestActionContext): Promise<Tag> {
    return this.crud.retrieve(context);
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(
    context: RestActionContext,
    payload: HttpBody<TagUpdatePayload>,
  ): Promise<Tag> {
    const tag = await this.crud.retrieve(context);
    return tag.assign(payload);
  }

  @rest.action("DELETE").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async delete(context: RestActionContext): Promise<NoContentResponse> {
    const tag = await this.crud.retrieve(context);
    this.database.remove(tag);
    return new NoContentResponse();
  }
}

interface TagCreationPayload {
  name: Tag["name"];
}

interface TagUpdatePayload extends Partial<TagCreationPayload> {}
