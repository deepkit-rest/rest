import { createModule } from "@deepkit/app";

import { UserListener } from "./user.listener";
import { UserResource, UserRetriever, UserSerializer } from "./user.resource";
import { UserSelfOnlyGuard } from "./user-self-only.guard";
import { UserVerificationCodePool } from "./user-verification-code";

export class UserModule extends createModule(
  {
    controllers: [UserResource],
    providers: [
      UserVerificationCodePool,
      UserSelfOnlyGuard,
      { provide: UserRetriever, scope: "http" },
      { provide: UserSerializer, scope: "http" },
    ],
    listeners: [UserListener],
  },
  "user",
) {}
