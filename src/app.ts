import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";

import { DatabaseModule } from "./database/database.module";
import { DB_URL, DEBUG, PORT } from "./shared/env.constants";

new App({
  imports: [
    new FrameworkModule({ debug: DEBUG, migrateOnStartup: DEBUG, port: PORT }),
    new DatabaseModule({ url: DB_URL, entities: [] }),
  ],
  providers: [],
}).run();
