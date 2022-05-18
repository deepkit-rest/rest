import { createModule } from "@deepkit/app";

import { UserController } from "./user.controller";

export class UserModule extends createModule({
  controllers: [UserController],
}) {}
