import { AppModule } from "@deepkit/app";
import { HtmlResponse, HttpError, RouteConfig } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import { ReflectionFunction } from "@deepkit/type";

import { RestGuardMetaValidated } from "./rest-meta";

export interface RestGuard {
  guard(): Promise<void>;
}

export class RestGuardRegistry extends Set<RestGuardRegistryItem> {
  searchByGroup(groupName: string): RestGuardRegistryItem[] {
    const matched: RestGuardRegistryItem[] = [];
    for (const item of this) {
      if (item.meta.groupName !== groupName) continue;
      matched.push(item);
    }
    return matched;
  }

  searchByGroups(groupNames: string[]): RestGuardRegistryItem[] {
    return groupNames.flatMap((groupName) => this.searchByGroup(groupName));
  }
}

export interface RestGuardRegistryItem {
  token: unknown;
  module: AppModule;
  meta: RestGuardMetaValidated;
}

export class RestGuardLauncher {
  private routeGuardMap = new Map<
    ReflectionFunction,
    RestGuardRegistryItem[]
  >();

  constructor(private registry: RestGuardRegistry) {}

  async launch(...guards: RestGuard[]): Promise<HtmlResponse | null> {
    for (const guard of guards)
      try {
        await guard.guard();
      } catch (error) {
        if (error instanceof HttpError)
          return new HtmlResponse(error.message, error.httpCode);
        throw error;
      }
    return null;
  }

  async launchForRoute(
    routeConfig: RouteConfig,
    injectorContext: InjectorContext,
  ): Promise<HtmlResponse | null> {
    const guardRegistryItems = this.getGuardRegistryItemsForRoute(routeConfig);
    const guards = guardRegistryItems.map(
      (item) => injectorContext.get(item.token, item.module) as RestGuard,
    );
    return this.launch(...guards);
  }

  private getGuardRegistryItemsForRoute(routeConfig: RouteConfig) {
    const methodSchema = routeConfig.getReflectionFunction();
    let items = this.routeGuardMap.get(methodSchema);
    if (!items) {
      items = this.registry.searchByGroups(routeConfig.groups);
      this.routeGuardMap.set(methodSchema, items);
    }
    return items;
  }
}
