import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { RestCrudService } from "src/rest/rest-crud.service";

import { RestFilterMapFactory } from "./models/rest-filter-map";
import { RestOrderMapFactory } from "./models/rest-order-map";
import { RestConfig } from "./rest.config";
import { restClass } from "./rest.decorator";
import { RestListener } from "./rest.listener";
import {
  RestActionContextReader,
  RestActionRouteParameterResolver,
} from "./rest-action";
import { RestResourceInstaller, RestResourceRegistry } from "./rest-resource";

export class RestModule extends createModule(
  {
    config: RestConfig,
    providers: [
      { provide: RestActionContextReader, scope: "http" },
      { provide: RestCrudService, scope: "http" },
      RestFilterMapFactory,
      RestOrderMapFactory,
    ],
    listeners: [RestListener],
    forRoot: true,
  },
  "rest",
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
    if (!module.isProvided(RestActionRouteParameterResolver))
      module.addProvider({
        provide: RestActionRouteParameterResolver,
        scope: "http",
      });

    this.registry.add({ module, type: controllerType });
    this.installer.setup(controllerType);
  }
}
