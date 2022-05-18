import { createModule } from "@deepkit/app";

import { UserController } from "./user.controller";
import { UserEventListener } from "./user.entity";

export class UserModule extends createModule({
  controllers: [UserController],
  listeners: [UserEventListener],
}) {}
