import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";

import { AuthModule } from "./auth/auth.module";
import { entities } from "./core/entities";
import { RequestContext } from "./core/request-context";
import { DatabaseModule } from "./database/database.module";
import { UserModule } from "./user/user.module";

new App({
  imports: [
    new FrameworkModule(),
    new DatabaseModule().withEntities(...entities),
    new AuthModule(),
    new UserModule(),
  ],
  providers: [{ provide: RequestContext, scope: "http" }],
})
  .loadConfigFromEnv()
  .run();
