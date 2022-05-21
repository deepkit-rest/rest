import { http, HttpAccessDeniedError, HttpBody } from "@deepkit/http";
import { InjectDatabaseSession } from "src/database/database.module";
import { HttpUnauthorizedError } from "src/shared/http-error";
import { User } from "src/user/user.entity";

import { AuthTokenService } from "./auth-token.service";

// TODO: determine whether to use alternative:
// - login: POST /sessions
// - logout: DELETE /sessions/current
// - register: POST /users

@http.controller("auth")
export class AuthController {
  constructor(
    private db: InjectDatabaseSession,
    private tokenService: AuthTokenService,
  ) {}

  @http.POST("login").serialization({ groupsExclude: ["hidden"] })
  async login(payload: HttpBody<AuthLoginPayload>): Promise<AuthResult> {
    const user = await this.db
      .query(User)
      .filter({ email: payload.identifier })
      .findOneOrUndefined();
    const verified = await user?.verify(payload.password);
    if (!user || !verified)
      throw new HttpUnauthorizedError("Invalid credentials");
    const refreshToken = await this.tokenService.signRefresh(user);
    const accessToken = await this.tokenService.signAccess(refreshToken);
    return { user, refreshToken, accessToken };
  }

  @http.POST("register").serialization({ groupsExclude: ["hidden"] })
  async register(payload: HttpBody<AuthRegisterPayload>): Promise<AuthResult> {
    const user = new User().assign(payload);
    this.db.add(user);
    const refreshToken = await this.tokenService.signRefresh(user);
    const accessToken = await this.tokenService.signAccess(refreshToken);
    await this.db.commit();
    return { user, refreshToken, accessToken };
  }

  @http.POST("refresh").serialization({ groupsExclude: ["hidden"] })
  async refresh(payload: HttpBody<AuthRefreshPayload>): Promise<string> {
    return this.tokenService.signAccess(payload.refreshToken);
  }

  @http
    .POST("logout")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async logout(): Promise<void> {
    // TODO: implement user token revoking
    throw new HttpAccessDeniedError("Not implemented");
  }
}

export interface AuthLoginPayload {
  identifier: string;
  password: string;
}

export interface AuthRegisterPayload {
  name: User["name"];
  email: User["email"];
  password: User["password"];
}

export interface AuthRefreshPayload {
  refreshToken: string;
}

export interface AuthResult {
  user: User;
  refreshToken: string;
  accessToken: string;
}
