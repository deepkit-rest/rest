import { ClassType } from "@deepkit/core";
import {
  createClassDecoratorContext as createClassDecorator,
  createPropertyDecoratorContext as createPropertyDecorator,
  entity,
  Merge as MergedDecorator,
  mergeDecorator,
} from "@deepkit/type";
import { PrettifiedDecoratorApi } from "@deepkit-rest/common";
import { HttpMethod } from "@deepkit-rest/http-extension";

import { RestGuard } from "./rest-guard";
import { RestActionMeta, RestGuardMeta, RestResourceMeta } from "./rest-meta";
import { RestResource } from "./rest-resource";

export class RestResourceDecoratorApi extends PrettifiedDecoratorApi<RestResourceMeta> {
  meta = new RestResourceMeta();

  onDecorate(type: ClassType<RestResource<unknown>>): void {
    this.meta.classType = type;
  }

  resource(entityType: ClassType<unknown>, path?: string): void {
    this.meta.entityType = entityType;
    if (!path) path = entity._fetch(entityType)?.collectionName;
    if (!path) throw new Error("Cannot determine resource name");
    this.meta.path = path;
  }

  useAction(name: string, action: RestActionMeta): void {
    action.resource = this.meta;
    this.meta.actions[name] = action;
  }
}

export const restResource = createClassDecorator(RestResourceDecoratorApi);

export class RestActionDecoratorApi extends PrettifiedDecoratorApi<RestActionMeta> {
  meta = new RestActionMeta();

  onDecorate(type: ClassType<unknown>, property?: string): void {
    if (!property) throw Error("Not decorated on property");
    restResource.useAction(property, this.meta)(type, property);
    this.meta.name = property;
  }

  action(method: HttpMethod, path?: string): void {
    this.meta.method = method;
    this.meta.path = path;
  }
}

export const restAction = createPropertyDecorator(RestActionDecoratorApi);

export class RestGuardDecoratorApi extends PrettifiedDecoratorApi<RestGuardMeta> {
  meta = new RestGuardMeta();

  onDecorate(type: ClassType<RestGuard>): void {
    this.meta.classType = type;
  }

  guard(groupName: string): void {
    this.meta.groupName = groupName;
  }
}

export const restGuard = createClassDecorator(RestGuardDecoratorApi);

export const rest: RestDecorator = mergeDecorator(
  restResource,
  restAction,
  restGuard,
);
export type RestDecorator = MergedDecorator<
  Omit<
    typeof restResource & typeof restAction & typeof restGuard,
    "_fetch" | "t" | "meta" | "onDecorator" | "onDecorate"
  >
>;
