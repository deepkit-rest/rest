import { createModule } from "@deepkit/app";

import { JwtModuleConfig } from "./jwt.config";
import { JwtService } from "./jwt.service";

export class JwtModule extends createModule(
  {
    providers: [JwtService],
    exports: [JwtService],
    config: JwtModuleConfig,
  },
  "jwt",
) {}
