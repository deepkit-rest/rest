import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import {
  RestActionContext,
  RestActionParameterResolver,
} from "./core/rest-action";
import { restClass } from "./core/rest-decoration";
import {
  RestResourceInstaller,
  RestResourceRegistry,
} from "./core/rest-resource";
import { RestCrudActionContext, RestCrudKernel } from "./crud/rest-crud";
import { RestGenericFilter } from "./crud/rest-filtering";
import {
  RestNoopPaginator,
  RestOffsetLimitPaginator,
} from "./crud/rest-pagination";
import { RestFieldBasedRetriever } from "./crud/rest-retrieving";
import { RestGenericEntitySerializer } from "./crud/rest-serialization";
import { RestGenericSorter } from "./crud/rest-sorting";
import { RestCreationSchemaFactory } from "./crud-models/rest-creation-schema";
import { RestFilterMapFactory } from "./crud-models/rest-filter-map";
import { RestOrderMapFactory } from "./crud-models/rest-order-map";
import { RestUpdateSchemaFactory } from "./crud-models/rest-update-schema";
import { RestConfig } from "./rest.config";
import { RestListener } from "./rest.listener";

export class RestModule extends createModule(
  {
    config: RestConfig,
    providers: [
      { provide: RestActionContext, scope: "http" },
      { provide: RestCrudKernel, scope: "http" },
      { provide: RestCrudActionContext, scope: "http" },
      RestFilterMapFactory,
      RestOrderMapFactory,
      RestCreationSchemaFactory,
      RestUpdateSchemaFactory,
      { provide: RestNoopPaginator, scope: "http" },
      { provide: RestOffsetLimitPaginator, scope: "http" },
      { provide: RestFieldBasedRetriever, scope: "http" },
      { provide: RestGenericFilter, scope: "http" },
      { provide: RestGenericSorter, scope: "http" },
      { provide: RestGenericEntitySerializer, scope: "http" },
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
    if (!module.isProvided(RestActionParameterResolver))
      module.addProvider({
        provide: RestActionParameterResolver,
        scope: "http",
      });

    this.registry.add({ module, type: controllerType });
    this.installer.setup(controllerType);
  }
}
