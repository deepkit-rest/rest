import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";

import { DatabaseModule } from "./database/database.module";
import { DB_URL, DEBUG } from "./shared/env.constants";

new App({
  imports: [
    new FrameworkModule({ debug: DEBUG, migrateOnStartup: DEBUG }),
    new DatabaseModule({ url: DB_URL, entities: [] }),
  ],
  providers: [],
}).run();
