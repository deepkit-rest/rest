import { createModule } from "@deepkit/app";

import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthListener } from "./auth.listener";
import { AuthCaptchaService } from "./auth-captcha.service";
import { AuthTokenService } from "./auth-token.service";

export class AuthModule extends createModule(
  {
    controllers: [AuthController],
    providers: [AuthTokenService, AuthCaptchaService, AuthGuard],
    listeners: [AuthListener],
  },
  "auth",
) {}
