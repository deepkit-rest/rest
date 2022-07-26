import {
  http,
  HttpBadRequestError,
  HttpBody,
  HttpUnauthorizedError,
} from "@deepkit/http";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { User } from "src/user/user.entity";

import { AuthCaptchaService } from "./auth-captcha.service";
import { AuthTokenService } from "./auth-token.service";

@http.controller("api/auth")
export class AuthController {
  constructor(
    private databaseSession: InjectDatabaseSession,
    private tokenService: AuthTokenService,
    private captchaService: AuthCaptchaService,
  ) {}

  @http.POST("captcha")
  @http.serialization({ groupsExclude: ["internal"] })
  async requestCaptcha(): Promise<AuthRequestCaptchaResult> {
    const [key, svg] = this.captchaService.request();
    return { key, svg };
  }

  @http.POST("login")
  @http.serialization({ groupsExclude: ["internal"] })
  async login(
    payload: HttpBody<AuthLoginPayload>,
  ): Promise<AuthAuthenticationResult> {
    this.captchaService.verify(payload.captchaKey, payload.captchaResult);
    const user = await this.databaseSession
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

  @http.POST("register")
  @http.serialization({ groupsExclude: ["internal"] })
  async register(
    payload: HttpBody<AuthRegisterPayload>,
  ): Promise<AuthAuthenticationResult> {
    this.captchaService.verify(payload.captchaKey, payload.captchaResult);
    const user = new User(payload);
    this.databaseSession.add(user);
    const refreshToken = await this.tokenService.signRefresh(user);
    const accessToken = await this.tokenService.signAccess(refreshToken);
    return { user, refreshToken, accessToken };
  }

  @http.POST("refresh")
  @http.serialization({ groupsExclude: ["internal"] })
  async refresh(payload: HttpBody<AuthRefreshPayload>): Promise<string> {
    return this.tokenService.signAccess(payload.refreshToken).catch(() => {
      throw new HttpBadRequestError();
    });
  }
}

export interface AuthLoginPayload {
  identifier: string;
  password: string;
  captchaKey: string;
  captchaResult: string;
}

export interface AuthRegisterPayload {
  name: User["name"];
  email: User["email"];
  password: User["password"];
  captchaKey: string;
  captchaResult: string;
}

export interface AuthRefreshPayload {
  refreshToken: string;
}

export interface AuthRequestCaptchaResult {
  key: string;
  svg: string;
}

export interface AuthAuthenticationResult {
  user: User;
  refreshToken: string;
  accessToken: string;
}
