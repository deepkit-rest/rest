import { createModule } from "@deepkit/app";
import { AppDatabase } from "src/database/database.service";

import { UserController } from "./user.controller";
import { UserEventListener } from "./user.entity";

// Temporary workaround due to a bug related to @deepkit/injector, will be
// fixed in the next release.
export const DATABASE_SESSION = Symbol();

export class UserModule extends createModule({
  controllers: [UserController],
  providers: [
    {
      provide: DATABASE_SESSION,
      useFactory: (db: AppDatabase) => db.createSession(),
      scope: "http",
    },
  ],
  listeners: [UserEventListener],
}) {}
