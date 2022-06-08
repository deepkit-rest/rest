import { createModule } from "@deepkit/app";
import { ResourceModule } from "src/resource/resource.module";

import { UserAdapter } from "./user.adapter";
import { UserController } from "./user.controller";
import { User } from "./user.entity";
import { UserListener } from "./user.listener";
import { UserVerificationService } from "./user-verification.service";

export class UserModule extends createModule(
  {
    controllers: [UserController],
    providers: [UserVerificationService],
    listeners: [UserListener],
  },
  "user",
) {
  override imports = [new ResourceModule<User>().withAdapter(UserAdapter)];
}
