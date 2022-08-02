import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { RestActionContext, RestActionParameterResolver } from "./rest-action";
import { RestCoreModuleConfig } from "./rest-core-config";
import { restClass } from "./rest-decoration";
import { RestGuardLauncher } from "./rest-guard";
import { RestListener } from "./rest-listener";
import { RestResourceInstaller, RestResourceRegistry } from "./rest-resource";

export class RestCoreModule extends createModule(
  {
    config: RestCoreModuleConfig,
    providers: [
      { provide: RestActionContext, scope: "http" },
      RestGuardLauncher,
    ],
    listeners: [RestListener],
    forRoot: true,
  },
  "restCore",
) {
  readonly registry = new RestResourceRegistry();
  readonly installer = new RestResourceInstaller(this.config);

  override process(): void {
    this.addProvider(
      { provide: RestResourceRegistry, useValue: this.registry },
      { provide: RestResourceInstaller, useValue: this.installer },
    );
  }

  override processController(
    module: AppModule<any, any>,
    controllerType: ClassType<any>,
  ): void {
    const isResource = !!restClass._fetch(controllerType);
    if (!isResource) return;

    if (!module.isProvided(controllerType))
      module.addProvider({
        provide: controllerType,
        scope: "http",
      });
    if (!module.isProvided(RestActionParameterResolver))
      module.addProvider({
        provide: RestActionParameterResolver,
        scope: "http",
      });

    this.registry.add({ module, type: controllerType });
    this.installer.setup(controllerType);
  }
}
