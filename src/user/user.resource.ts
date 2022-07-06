import {
  http,
  HttpAccessDeniedError,
  HttpBadRequestError,
  HttpBody,
  HttpNotFoundError,
} from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { purify } from "src/common/type";
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { NoContentResponse } from "src/http-extension/http-common";
import { rest } from "src/rest/core/rest.decorator";
import { RestActionContext } from "src/rest/core/rest-action";
import { RestResource } from "src/rest/core/rest-resource";
import { RestCrudService } from "src/rest/crud/rest-crud";
import { RestList } from "src/rest/crud/rest-list";
import { RestRetrieveCustomizations } from "src/rest/crud/rest-retrieve";

import { User } from "./user.entity";
import { UserVerificationService } from "./user-verification.service";

@rest.resource(User).lookup("id")
export class UserResource
  implements RestResource<User>, RestRetrieveCustomizations
{
  constructor(
    private context: RequestContext,
    private database: InjectDatabaseSession,
    private crud: RestCrudService,
    private verificationService: UserVerificationService,
  ) {}

  query(): orm.Query<User> {
    return this.database.query(User);
  }

  lookup(raw: unknown): unknown {
    return raw === "me" ? this.context.user.id : purify<User["id"]>(raw);
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(context: RestActionContext<User>): Promise<RestList<User>> {
    return this.crud.list(context);
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(context: RestActionContext<User>): Promise<User> {
    return this.crud.retrieve(context);
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(
    context: RestActionContext<User>,
    id: User["id"],
    payload: HttpBody<Partial<Pick<User, "name" | "email" | "password">>>,
  ): Promise<User> {
    if (id !== "me") throw new HttpAccessDeniedError();
    const user = await this.retrieve(context);
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
    context: RestActionContext<User>,
    id: User["id"],
    { code }: HttpBody<{ code: string }>, //
  ): Promise<NoContentResponse> {
    if (id !== "me") throw new HttpAccessDeniedError();
    if (!this.verificationService.exists(this.context.user.id))
      throw new HttpNotFoundError("No pending verification");
    const user = await this.retrieve(context);
    const verified = this.verificationService.confirm(user.id, code);
    if (!verified) throw new HttpBadRequestError("Code not match");
    user.verifiedAt = new Date();
    return new NoContentResponse();
  }
}
