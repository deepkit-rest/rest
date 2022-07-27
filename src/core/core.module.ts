import { createModule } from "@deepkit/app";
import { Database } from "@deepkit/orm";

import { CoreModuleConfig } from "./core.config";
import { SQLiteDatabase } from "./database";
import { RequestContext } from "./request-context";

export class CoreModule extends createModule({
  providers: [
    { provide: Database, useClass: SQLiteDatabase },
    { provide: RequestContext, scope: "http" },
  ],
  config: CoreModuleConfig,
  forRoot: true,
}) {}
