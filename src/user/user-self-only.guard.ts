import { HttpAccessDeniedError } from "@deepkit/http";
import { RequestContext } from "src/core/request-context";
import { HttpRequestParsed } from "src/http-extension/http-request-parsed.service";
import { RestGuard } from "src/rest/core/rest-guard";

export class UserSelfOnlyGuard implements RestGuard {
  constructor(
    private request: HttpRequestParsed,
    private requestContext: RequestContext,
  ) {}

  async guard(): Promise<void> {
    const parameters = this.request.getPathParams();
    if (
      parameters["pk"] !== this.requestContext.user.id &&
      parameters["pk"] !== "me"
    )
      throw new HttpAccessDeniedError("Cannot perform on other users");
  }
}
