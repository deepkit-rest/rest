import { createModule } from "@deepkit/app";

import { AuthController } from "./auth.controller";
import { AuthGuard, AuthGuardListener } from "./auth.guard";
import { AuthCaptchaService } from "./auth-captcha.service";
import { AuthTokenService } from "./auth-token.service";

export class AuthModule extends createModule(
  {
    controllers: [AuthController],
    providers: [
      AuthTokenService,
      AuthCaptchaService,
      { provide: AuthGuard, scope: "http" },
    ],
    exports: [AuthGuard],
    listeners: [AuthGuardListener],
  },
  "auth",
) {}
