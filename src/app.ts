import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";

import { AuthModule } from "./auth/auth.module";
import { entities } from "./core/entities";
import { RequestContext } from "./core/request-context";
import { DatabaseModule } from "./database/database.module";
import { EmailEngineModule } from "./email-engine/email-engine.module";
import { FileModule } from "./file/file.module";
import { FileEngineModule } from "./file-engine/file-engine.module";
import { HttpExtensionModule } from "./http-extension/http-extension.module";
import { RestModule } from "./rest/rest.module";
import { RestCrudModule } from "./rest-crud/rest-crud.module";
import { UserModule } from "./user/user.module";

new App({
  imports: [
    new FrameworkModule(),
    new HttpExtensionModule(),
    new DatabaseModule().withEntities(...entities),
    new RestModule(),
    new RestCrudModule(),
    new FileEngineModule(),
    new EmailEngineModule(),
    new AuthModule(),
    new UserModule(),
    new FileModule(),
  ],
  providers: [{ provide: RequestContext, scope: "http" }],
})
  .loadConfigFromEnv()
  .run();
