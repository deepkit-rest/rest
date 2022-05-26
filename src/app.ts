import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { FrameworkModule } from "@deepkit/framework";

import { AuthModule } from "./auth/auth.module";
import { RequestContext } from "./core/request-context";
import { DatabaseModule } from "./database/database.module";
import { User } from "./user/user.entity";
import { UserModule } from "./user/user.module";

const entities: ClassType[] = [User];

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
