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

export abstract class RestSimpleBodyPaginator implements RestEntityPaginator {
  abstract processQuery<Entity>(query: Query<Entity>): Query<Entity>;
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

export class RestNoopPaginator
  extends RestSimpleBodyPaginator
  implements RestEntityPaginator
{
  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    return query;
  }
}

export class RestOffsetLimitPaginator
  extends RestSimpleBodyPaginator
  implements RestEntityPaginator
{
  limitDefault = 30;
  limitMax = 50;
  limitParam = "limit";
  offsetMax = 1000;
  offsetParam = "offset";

  constructor(protected request: HttpRequestContext) {
    super();
  }

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const { limitDefault, limitMax, limitParam, offsetMax, offsetParam } = this;

    type Limit = number & PositiveNoZero & Maximum<typeof limitMax>;
    type Offset = number & Positive & Maximum<typeof offsetMax>;

    const queries = this.request.getQueries();
    const limit = purify<Limit>(queries[limitParam] ?? limitDefault);
    const offset = purify<Offset>(queries[offsetParam] ?? 0);

    return query.limit(limit).skip(offset);
  }
}

export class RestPageNumberPaginator
  extends RestSimpleBodyPaginator
  implements RestEntityPaginator
{
  pageNumberMax = 20;
  pageNumberParam = "page";
  pageSizeDefault = 30;
  pageSizeMax = 50;
  pageSizeParam = "size";

  constructor(protected request: HttpRequestContext) {
    super();
  }

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const {
      pageNumberMax: numberMax,
      pageNumberParam: numberParam,
      pageSizeDefault: sizeDefault,
      pageSizeMax: sizeMax,
      pageSizeParam: sizeParam,
    } = this;

    type PageNumber = number & PositiveNoZero & Maximum<typeof numberMax>;
    type PageSize = number & PositiveNoZero & Maximum<typeof sizeMax>;

    const queries = this.request.getQueries();
    const number = purify<PageNumber>(queries[numberParam] ?? 1);
    const size = purify<PageSize>(queries[sizeParam] ?? sizeDefault);

    return query.itemsPerPage(size).page(number);
  }
}
