import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";

import { AuthModule } from "./auth/auth.module";
import { CoreModule } from "./core/core.module";
import { DatabaseExtensionModule } from "./database-extension/database-extension.module";
import { EmailEngineModule } from "./email-engine/email-engine.module";
import { FileModule } from "./file/file.module";
import { FileEngineModule } from "./file-engine/file-engine.module";
import { HttpExtensionModule } from "./http-extension/http-extension.module";
import { RestModule } from "./rest/rest.module";
import { UserModule } from "./user/user.module";

new App({
  imports: [
    new FrameworkModule(),
    new CoreModule(),
    new HttpExtensionModule(),
    new DatabaseExtensionModule(),
    new RestModule(),
    new FileEngineModule(),
    new EmailEngineModule(),
    new AuthModule(),
    new UserModule(),
    new FileModule(),
  ],
})
  .loadConfigFromEnv()
  .run();
