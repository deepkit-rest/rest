import { createModule } from "@deepkit/app";
import { JwtModule } from "src/jwt/jwt.module";

import { AuthController } from "./auth.controller";
import { AuthListener } from "./auth.listener";
import { AuthTokenService } from "./auth-token.service";

export class AuthModule extends createModule(
  {
    controllers: [AuthController],
    providers: [AuthTokenService],
    listeners: [AuthListener],
  },
  "auth",
) {
  override imports = [new JwtModule()];
}
