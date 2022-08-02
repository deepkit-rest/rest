import { ClassType } from "@deepkit/core";
import {
  createClassDecoratorContext as createClassDecorator,
  createPropertyDecoratorContext as createPropertyDecorator,
  entity,
  Merge as MergedDecorator,
  mergeDecorator,
} from "@deepkit/type";
import { PrettifiedDecoratorApi } from "src/common/decorator";
import { HttpMethod } from "src/http-extension/http-common";

import { RestGuard } from "./rest-guard";
import { RestActionMeta, RestResourceMeta } from "./rest-meta";
import { RestResource } from "./rest-resource";

export class RestClassDecoratorApi extends PrettifiedDecoratorApi<RestResourceMeta> {
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

  guardedBy(...guards: ClassType<RestGuard>[]): void {
    this.meta.guards.push(...guards);
  }

  useAction(name: string, action: RestActionMeta): void {
    action.resource = this.meta;
    this.meta.actions[name] = action;
  }
}

export const restClass = createClassDecorator(RestClassDecoratorApi);

export class RestPropertyDecoratorApi extends PrettifiedDecoratorApi<RestActionMeta> {
  meta = new RestActionMeta();

  onDecorate(type: ClassType<unknown>, property?: string): void {
    if (!property) throw Error("Not decorated on property");
    restClass.useAction(property, this.meta)(type, property);
    this.meta.name = property;
  }

  action(method: HttpMethod, path?: string): void {
    this.meta.method = method;
    this.meta.path = path;
  }

  guardedBy(...guards: ClassType<RestGuard>[]): void {
    this.meta.guards.push(...guards);
  }
}

export const restProperty = createPropertyDecorator(RestPropertyDecoratorApi);

export const rest: RestDecorator = mergeDecorator(restClass, restProperty);
export type RestDecorator = MergedDecorator<
  Omit<
    typeof restClass & typeof restProperty,
    "_fetch" | "t" | "meta" | "onDecorator" | "onDecorate"
  >
>;
