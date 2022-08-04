import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { RestActionContext, RestActionParameterResolver } from "./rest-action";
import { RestCoreModuleConfig } from "./rest-core-config";
import { restGuard, restResource } from "./rest-decoration";
import { RestGuardLauncher, RestGuardRegistry } from "./rest-guard";
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
  readonly resourceRegistry = new RestResourceRegistry();
  readonly resourceInstaller = new RestResourceInstaller(this.config);
  readonly guardRegistry = new RestGuardRegistry();

  override process(): void {
    this.addProvider(
      { provide: RestResourceRegistry, useValue: this.resourceRegistry },
      { provide: RestResourceInstaller, useValue: this.resourceInstaller },
      { provide: RestGuardRegistry, useValue: this.guardRegistry },
    );
  }

  override processProvider(module: AppModule<any, any>, token: unknown): void {
    const meta = restGuard._fetch(token as any)?.validate();
    if (!meta) return;
    this.guardRegistry.add({ token, module, meta });
  }

  override processController(
    module: AppModule<any, any>,
    controllerType: ClassType<any>,
  ): void {
    const isResource = !!restResource._fetch(controllerType);
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

    this.resourceRegistry.add({ module, type: controllerType });
    this.resourceInstaller.setup(controllerType);
  }
}
