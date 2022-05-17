import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";

import { DatabaseModule } from "./database/database.module";

new App({
  imports: [new FrameworkModule(), new DatabaseModule().withEntities()],
  providers: [],
})
  .loadConfigFromEnv()
  .run();
