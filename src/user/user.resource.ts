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
import { EmailEngine } from "src/email-engine/email-engine.interface";
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
import { UserVerificationCodePool } from "./user-verification-code";

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
    private mailer: EmailEngine,
    private verificationCodePool: UserVerificationCodePool,
  ) {
    super(database);
  }

  getQuery(): Query<User> {
    return this.databaseSession.query(User);
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async list(): Promise<ResponseReturnType> {
    return this.crud.list();
  }

  @rest.action("GET", ":pk")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async retrieve(): Promise<ResponseReturnType> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH", ":pk")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async update(pk: User["id"]): Promise<ResponseReturnType> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    return this.crud.update();
  }

  @rest.action("PUT", ":pk/verification")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  @http
    .response(204, "Verification requested")
    .response(403, "Duplicate verification request")
  async requestVerification(pk: User["id"]): Promise<NoContentResponse> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    try {
      const userId = this.requestContext.user.id;
      const code = this.verificationCodePool.request(userId);
      const user = await this.crudContext.getEntity();
      await this.mailer.send({
        subject: "Verify Your Email",
        content: `Verification Code: ${code}`,
        contentInHtml: `Verification Code: <b>${code}</b>`,
        recipients: [{ address: user.email }],
      });
    } catch (error) {
      throw new HttpAccessDeniedError("Duplicate verification request");
    }
    return new NoContentResponse();
  }

  @rest.action("GET", ":pk/verification")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  @http
    .response(204, "Pending verification exists")
    .response(404, "No pending verification")
  async inspectVerification(pk: User["id"]): Promise<NoContentResponse> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    const code = this.verificationCodePool.obtain(this.requestContext.user.id);
    if (!code) throw new HttpNotFoundError("No pending verification");
    return new NoContentResponse();
  }

  @rest.action("PUT", ":pk/verification/confirmation")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  @http
    .response(204, "Verified")
    .response(400, "Code not match")
    .response(404, "No pending verification")
  async confirmVerification(
    pk: User["id"],
    { code }: HttpBody<{ code: string }>, //
  ): Promise<NoContentResponse> {
    if (pk !== "me") throw new HttpAccessDeniedError();
    const userId = this.requestContext.user.id;
    const codeExpected = this.verificationCodePool.obtain(userId);
    if (!codeExpected) throw new HttpNotFoundError("No pending verification");
    const user = await this.crudContext.getEntity();
    if (code !== codeExpected) throw new HttpBadRequestError("Code not match");
    this.verificationCodePool.remove(userId);
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
