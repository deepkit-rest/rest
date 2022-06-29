import { ClassType } from "@deepkit/core";
import { http } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { join } from "path";

import { RestConfig } from "./rest.config";
import { restClass } from "./rest.decorator";
import { RestResourceMeta } from "./rest.meta";
import { RestActionRouteParameterResolver } from "./rest-action";

export interface RestResource<Entity> {
  query(): orm.Query<Entity>;
}

export class RestResourceManager {
  constructor(
    private config: RestConfig,
    private parameterResolver: RestActionRouteParameterResolver,
  ) {}

  setup(type: ResourceClassType): void {
    const meta = this.getMetaOrThrow(type);
    const path =
      this.config.versioning && meta.version
        ? `${this.config.prefix}/${this.config.versioning}${meta.version}/${meta.name}`
        : `${this.config.prefix}/${meta.name}`;
    http.controller(path)(type);
    Object.keys(meta.actions).forEach((name) => this.setupAction(type, name));
  }

  setupAction(type: ResourceClassType, name: string): void {
    const resourceMeta = this.getMetaOrThrow(type).validate();
    const actionMeta = resourceMeta.actions[name].validate();
    let path = actionMeta.detailed ? `:${resourceMeta.lookup}` : "";
    if (actionMeta.path) path = join(path, actionMeta.path);
    http[actionMeta.method](path)(type.prototype, name);
    this.parameterResolver.setupAction(actionMeta);
    actionMeta.configurators.forEach((configurator) => {
      configurator.configure();
    });
  }

  private getMetaOrThrow(type: ResourceClassType): RestResourceMeta {
    const meta = restClass._fetch(type)?.validate();
    if (!meta) throw new Error("Resource not decorated");
    return meta;
  }
}

type ResourceClassType = ClassType<RestResource<unknown>>;
