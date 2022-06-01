import { RequestContext } from "src/core/request-context";
import { Guard, GuardContext } from "src/shared/guard";
import { HttpUnauthorizedError } from "src/shared/http";

import { AuthTokenService } from "./auth-token.service";

export class AuthGuard implements Guard {
  constructor(private tokenService: AuthTokenService) {}

  async guard(context: GuardContext): Promise<void> {
    if (!context.route.groups.includes("protected")) return;

    const authorization = context.request.headers["authorization"];
    if (!authorization) throw new HttpUnauthorizedError();
    const match = authorization.match(/^Bearer (?<token>.*)$/u);
    const token = match?.groups?.["token"];
    if (!token) throw new HttpUnauthorizedError();
    const payload = await this.tokenService
      .decodeAndVerify(token)
      .catch(() => null);
    if (payload?.type !== "access") throw new HttpUnauthorizedError();

    const requestContext = context.injector.get(RequestContext);
    requestContext.user = payload.user;
  }
}
