import { createModule } from "@deepkit/app";

import { AuthController } from "./auth.controller";
import { AuthTokenService } from "./auth-token.service";

export class AuthConfig {
  secret!: string;
}

export class AuthModule extends createModule(
  {
    controllers: [AuthController],
    providers: [AuthTokenService],
    config: AuthConfig,
  },
  "auth",
) {}
