import { createModule } from "@deepkit/app";
import { ResourceModule } from "src/resource/resource.module";

import { UserController } from "./user.controller";
import { User, UserEventListener } from "./user.entity";

export class UserModule extends createModule(
  {
    controllers: [UserController],
    providers: [],
    listeners: [UserEventListener],
  },
  "user",
) {
  override imports = [new ResourceModule<User>()];
}
