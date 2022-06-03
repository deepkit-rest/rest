import { createModule } from "@deepkit/app";
import { ResourceModule } from "src/resource/resource.module";

import { UserAdapter } from "./user.adapter";
import { UserController } from "./user.controller";
import { User } from "./user.entity";
import { UserListener } from "./user.listener";

export class UserModule extends createModule(
  {
    controllers: [UserController],
    providers: [],
    listeners: [UserListener],
  },
  "user",
) {
  override imports = [new ResourceModule<User>().withAdapter(UserAdapter)];
}
