import { createModule } from "@deepkit/app";

import { JwtService } from "./jwt.service";

export class JwtConfig {
  secret!: string;
}

export class JwtModule extends createModule(
  {
    providers: [JwtService],
    exports: [JwtService],
    config: JwtConfig,
  },
  "jwt",
) {}
