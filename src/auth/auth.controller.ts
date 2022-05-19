import { http, HttpAccessDeniedError, HttpBody } from "@deepkit/http";
import { InjectDatabaseSession } from "src/database/database.module";
import { HttpUnauthorizedError } from "src/shared/http-error";
import { User, UserPassword } from "src/user/user.entity";

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

  @http.POST("login")
  async login(payload: HttpBody<AuthLoginPayload>): Promise<AuthResult> {
    const user = await this.db
      .query(User)
      .filter({ email: payload.identifier })
      .findOneOrUndefined();
    const verified = await user?.verify(payload.password);
    if (!user || !verified)
      throw new HttpUnauthorizedError("Invalid credentials");
    const token = await this.tokenService.sign(user);
    return { user, token };
  }

  @http.POST("register")
  async register(payload: HttpBody<AuthRegisterPayload>): Promise<AuthResult> {
    const user = new User().assign(payload);
    this.db.add(user);
    const token = await this.tokenService.sign(user);
    await this.db.commit();
    return { user, token };
  }

  @http.POST("logout")
  async logout(): Promise<void> {
    // TODO: implement user token revoking
    throw new HttpAccessDeniedError("Not implemented");
  }
}

export interface AuthLoginPayload {
  identifier: string;
  password: string;
}

// We cannot use `User["name"]` here because the type decorators will not
// be copied. (bug)
export interface AuthRegisterPayload extends Pick<User, "name" | "email"> {
  password: UserPassword;
}

export interface AuthResult {
  user: User;
  token: string;
}
