import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release

export interface RestResource<Entity> {
  query(): orm.Query<Entity>;
}

export interface RestActionHandler {
  handle(...args: any[]): any;
}

export interface ResolvedRestActionHandler {
  (): Promise<any>;
}
