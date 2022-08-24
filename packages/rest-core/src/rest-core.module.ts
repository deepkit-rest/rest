import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { RestActionContext, RestActionParameterResolver } from "./rest-action";
import { RestCoreModuleConfig } from "./rest-core.module-config";
import { restGuard, restResource } from "./rest-decoration";
import { RestGuard, RestGuardLauncher, RestGuardRegistry } from "./rest-guard";
import { RestListener } from "./rest-listener";
import {
  RestResourceMetaSetup,
  RestResourceRegistry,
  RestResourceRouter,
} from "./rest-resource";

export class RestCoreModule extends createModule(
  {
    config: RestCoreModuleConfig,
    providers: [
      RestResourceRouter,
      { provide: RestActionContext, scope: "http" },
      RestGuardLauncher,
    ],
    listeners: [RestListener],
    forRoot: true,
  },
  "restCore",
) {
  readonly resourceRegistry = new RestResourceRegistry();
  readonly resourceMetaSetup = new RestResourceMetaSetup(this.getConfig());
  readonly guardRegistry = new RestGuardRegistry();

  override process(): void {
    this.addProvider(
      { provide: RestResourceRegistry, useValue: this.resourceRegistry },
      { provide: RestResourceMetaSetup, useValue: this.resourceMetaSetup },
      { provide: RestGuardRegistry, useValue: this.guardRegistry },
    );
  }

  override processProvider(module: AppModule<any, any>, token: unknown): void {
    const meta = restGuard._fetch(token as any)?.validate();
    if (!meta) return;
    const type = token as ClassType<RestGuard>;
    this.guardRegistry.add({ type, module, meta });
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
    this.resourceMetaSetup.setup(controllerType);
  }
}
