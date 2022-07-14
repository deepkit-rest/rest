import {
  http,
  HttpAccessDeniedError,
  HttpBadRequestError,
  HttpBody,
  HttpNotFoundError,
} from "@deepkit/http";
import { Query } from "@deepkit/orm";
import { ReflectionProperty } from "@deepkit/type";
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
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
  RestFieldBasedRetriever,
  RestRetrievingCustomizations,
} from "src/rest/crud/rest-retrieving";
import {
  RestGenericSorter,
  RestSortingCustomizations,
} from "src/rest/crud/rest-sorting";

import { User } from "./user.entity";
import { UserVerificationService } from "./user-verification.service";

@rest.resource(User).lookup("id")
export class UserResource
  implements
    RestResource<User>,
    RestRetrievingCustomizations,
    RestPaginationCustomizations,
    RestFilteringCustomizations,
    RestSortingCustomizations
{
  readonly retriever = UserRetriever;
  readonly paginator = RestOffsetLimitPaginator;
  readonly filters = [RestGenericFilter];
  readonly sorters = [RestGenericSorter];

  constructor(
    private context: RequestContext,
    private database: InjectDatabaseSession,
    private crud: RestCrudService,
    private verificationService: UserVerificationService,
  ) {}

  query(): Query<User> {
    return this.database.query(User);
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(): Promise<RestList<User>> {
    return this.crud.list();
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(): Promise<User> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(
    id: User["id"],
    payload: HttpBody<Partial<Pick<User, "name" | "email" | "password">>>,
  ): Promise<User> {
    if (id !== "me") throw new HttpAccessDeniedError();
    const user = await this.retrieve();
    return user.assign(payload);
  }

  @rest.action("PUT").detailed().path("verification")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "Verification requested")
    .response(403, "Duplicate verification request")
  async requestVerification(id: User["id"]): Promise<NoContentResponse> {
    if (id !== "me") throw new HttpAccessDeniedError();
    try {
      this.verificationService.request(this.context.user.id);
    } catch (error) {
      throw new HttpAccessDeniedError("Duplicate verification request");
    }
    return new NoContentResponse();
  }

  @rest.action("GET").detailed().path("verification")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "Pending verification exists")
    .response(404, "No pending verification")
  async inspectVerification(id: User["id"]): Promise<NoContentResponse> {
    if (id !== "me") throw new HttpAccessDeniedError();
    if (!this.verificationService.exists(this.context.user.id))
      throw new HttpNotFoundError("No pending verification");
    return new NoContentResponse();
  }

  @rest.action("PUT").detailed().path("verification/confirmation")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "Verified")
    .response(400, "Code not match")
    .response(404, "No pending verification")
  async confirmVerification(
    id: User["id"],
    { code }: HttpBody<{ code: string }>, //
  ): Promise<NoContentResponse> {
    if (id !== "me") throw new HttpAccessDeniedError();
    if (!this.verificationService.exists(this.context.user.id))
      throw new HttpNotFoundError("No pending verification");
    const user = await this.retrieve();
    const verified = this.verificationService.confirm(user.id, code);
    if (!verified) throw new HttpBadRequestError("Code not match");
    user.verifiedAt = new Date();
    return new NoContentResponse();
  }
}

export class UserRetriever extends RestFieldBasedRetriever {
  constructor(
    private requestContext: RequestContext,
    context: RestActionContext,
  ) {
    super(context);
  }

  protected override transformValue(
    raw: unknown,
    schema: ReflectionProperty,
  ): unknown {
    if (raw === "me") return this.requestContext.user.id;
    return super.transformValue(raw, schema);
  }
}
