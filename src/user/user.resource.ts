import {
  http,
  HttpAccessDeniedError,
  HttpBadRequestError,
  HttpBody,
  HttpNotFoundError,
} from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import { Database, Query } from "@deepkit/orm";
import { ReflectionProperty } from "@deepkit/type";
import { RequestContext } from "src/core/request-context";
import { AppEntitySerializer, AppResource } from "src/core/rest";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { NoContentResponse } from "src/http-extension/http-common";
import { rest } from "src/rest/core/rest-decoration";
import {
  ResponseReturnType,
  RestCrudActionContext,
  RestCrudKernel,
} from "src/rest/crud/rest-crud";
import {
  RestRetrievingCustomizations,
  RestSingleFieldRetriever,
} from "src/rest/crud/rest-retrieving";
import { RestSerializationCustomizations } from "src/rest/crud/rest-serialization";

import { User } from "./user.entity";
import { UserVerificationService } from "./user-verification.service";

@rest.resource(User)
export class UserResource
  extends AppResource<User>
  implements
    RestRetrievingCustomizations,
    RestSerializationCustomizations<User>
{
  readonly retriever = UserRetriever;
  readonly serializer = UserSerializer;

  constructor(
    database: Database,
    private requestContext: RequestContext,
    private databaseSession: InjectDatabaseSession,
    private crud: RestCrudKernel<User>,
    private crudContext: RestCrudActionContext<User>,
    private verificationService: UserVerificationService,
  ) {
    super(database);
  }

  getQuery(): Query<User> {
    return this.databaseSession.query(User);
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(): Promise<ResponseReturnType> {
    return this.crud.list();
  }

  @rest.action("GET", ":pk")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(): Promise<ResponseReturnType> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH", ":pk")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(pk: User["id"]): Promise<ResponseReturnType> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    return this.crud.update();
  }

  @rest.action("PUT", ":pk/verification")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "Verification requested")
    .response(403, "Duplicate verification request")
  async requestVerification(pk: User["id"]): Promise<NoContentResponse> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    try {
      this.verificationService.request(this.requestContext.user.id);
    } catch (error) {
      throw new HttpAccessDeniedError("Duplicate verification request");
    }
    return new NoContentResponse();
  }

  @rest.action("GET", ":pk/verification")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "Pending verification exists")
    .response(404, "No pending verification")
  async inspectVerification(pk: User["id"]): Promise<NoContentResponse> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    if (!this.verificationService.exists(this.requestContext.user.id))
      throw new HttpNotFoundError("No pending verification");
    return new NoContentResponse();
  }

  @rest.action("PUT", ":pk/verification/confirmation")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "Verified")
    .response(400, "Code not match")
    .response(404, "No pending verification")
  async confirmVerification(
    pk: User["id"],
    { code }: HttpBody<{ code: string }>, //
  ): Promise<NoContentResponse> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    if (!this.verificationService.exists(this.requestContext.user.id))
      throw new HttpNotFoundError("No pending verification");
    const user = await this.crudContext.getEntity();
    const verified = this.verificationService.confirm(user.id, code);
    if (!verified) throw new HttpBadRequestError("Code not match");
    user.verifiedAt = new Date();
    return new NoContentResponse();
  }
}

export class UserRetriever extends RestSingleFieldRetriever {
  private requestContext!: Inject<RequestContext>;

  protected override transformValue(
    raw: unknown,
    schema: ReflectionProperty,
  ): unknown {
    if (raw === "me") return this.requestContext.user.id;
    return super.transformValue(raw, schema);
  }
}

export class UserSerializer extends AppEntitySerializer<User> {}
