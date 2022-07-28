import { HttpAccessDeniedError } from "@deepkit/http";
import { Guard, GuardContext } from "src/common/guard";
import { RequestContext } from "src/core/request-context";
import { HttpRequestParsed } from "src/http-extension/http-request-parsed.service";

export class UserSelfOnlyGuard implements Guard {
  async guard(context: GuardContext): Promise<void> {
    const request = context.injector.get(HttpRequestParsed);
    const requestContext = context.injector.get(RequestContext);
    const parameters = request.getPathParams();
    if (
      parameters["pk"] !== requestContext.user.id &&
      parameters["pk"] !== "me"
    )
      throw new HttpAccessDeniedError("Cannot perform on other users");
  }
}
