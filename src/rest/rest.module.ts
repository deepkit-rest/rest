import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { restClass } from "./core/rest.decorator";
import { RestListener } from "./core/rest.listener";
import {
  RestActionContextReader,
  RestActionRouteParameterResolver,
} from "./core/rest-action";
import {
  RestResourceInstaller,
  RestResourceRegistry,
} from "./core/rest-resource";
import { RestCrudService } from "./crud/rest-crud";
import { RestGenericFilter, RestGenericSorter } from "./crud/rest-filtering";
import { RestListService } from "./crud/rest-list";
import { RestOffsetLimitPaginator } from "./crud/rest-pagination";
import { RestRetrieveService } from "./crud/rest-retrieve";
import { RestFieldBasedRetriever } from "./crud/rest-retrieving";
import { RestFilterMapFactory } from "./crud-models/rest-filter-map";
import { RestOrderMapFactory } from "./crud-models/rest-order-map";
import { RestConfig } from "./rest.config";

export class RestModule extends createModule(
  {
    config: RestConfig,
    providers: [
      { provide: RestActionContextReader, scope: "http" },
      { provide: RestListService, scope: "http" },
      { provide: RestRetrieveService, scope: "http" },
      { provide: RestCrudService, scope: "http" },
      RestFilterMapFactory,
      RestOrderMapFactory,
      { provide: RestOffsetLimitPaginator, scope: "http" },
      { provide: RestFieldBasedRetriever, scope: "http" },
      { provide: RestGenericFilter, scope: "http" },
      { provide: RestGenericSorter, scope: "http" },
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
