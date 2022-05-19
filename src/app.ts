import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { FrameworkModule } from "@deepkit/framework";

import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { ResourceModule } from "./resource/resource.module";
import { User } from "./user/user.entity";
import { UserModule } from "./user/user.module";

const entities: ClassType[] = [User];

new App({
  imports: [
    new FrameworkModule(),
    new DatabaseModule().withEntities(...entities),
    new ResourceModule(),
    new AuthModule(),
    new UserModule(),
  ],
  providers: [],
})
  .loadConfigFromEnv()
  .run();
