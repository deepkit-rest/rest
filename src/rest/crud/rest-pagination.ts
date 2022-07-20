import { ClassType } from "@deepkit/core";
import { Query } from "@deepkit/orm";
import { Maximum, Positive, PositiveNoZero } from "@deepkit/type";
import { purify } from "src/common/type";
import { HttpRequestContext } from "src/http-extension/http-request-context.service";

import { RestQueryProcessor } from "./rest-crud";

export interface RestPaginationCustomizations {
  paginator?: ClassType<RestEntityPaginator>;
}

export interface RestEntityPaginator extends RestQueryProcessor {
  buildBody(
    items: () => Promise<unknown[]>,
    total: () => Promise<number>,
  ): Promise<unknown>;
}

export class RestNoopPaginator implements RestEntityPaginator {
  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    return query;
  }
  async buildBody(
    items: () => Promise<unknown[]>,
    total: () => Promise<number>,
  ): Promise<unknown> {
    return {
      total: await total(),
      items: await items(),
    };
  }
}

export class RestOffsetLimitPaginator implements RestEntityPaginator {
  limitDefault = 30;
  limitMax = 50;
  limitParam = "limit";
  offsetMax = 1000;
  offsetParam = "offset";

  constructor(protected request: HttpRequestContext) {}

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const { limitDefault, limitMax, limitParam, offsetMax, offsetParam } = this;

    type Limit = number & PositiveNoZero & Maximum<typeof limitMax>;
    type Offset = number & Positive & Maximum<typeof offsetMax>;

    const queries = this.request.getQueries();
    const limit = purify<Limit>(queries[limitParam] ?? limitDefault);
    const offset = purify<Offset>(queries[offsetParam] ?? 0);

    return query.limit(limit).skip(offset);
  }

  async buildBody(
    items: () => Promise<unknown[]>,
    total: () => Promise<number>,
  ): Promise<unknown> {
    return {
      total: await total(),
      items: await items(),
    };
  }
}
