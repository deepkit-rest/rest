import { createModule } from "@deepkit/app";

import { JwtConfig } from "./jwt.config";
import { JwtService } from "./jwt.service";

export class JwtModule extends createModule(
  {
    providers: [JwtService],
    exports: [JwtService],
    config: JwtConfig,
  },
  "jwt",
) {}
