import { createModule } from "@deepkit/app";

import { UserListener } from "./user.listener";
import { UserResource, UserRetriever } from "./user.resource";
import { UserVerificationService } from "./user-verification.service";

export class UserModule extends createModule(
  {
    controllers: [UserResource],
    providers: [
      UserVerificationService,
      { provide: UserRetriever, scope: "http" },
    ],
    listeners: [UserListener],
  },
  "user",
) {}
