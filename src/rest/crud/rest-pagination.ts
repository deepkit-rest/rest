import { ClassType } from "@deepkit/core";
import { Query } from "@deepkit/orm";
import { Maximum, Positive, PositiveNoZero } from "@deepkit/type";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";

export interface RestPaginationCustomizations {
  paginator?: ClassType<RestPaginator>;
}

export interface RestPaginator {
  paginate<Entity>(
    context: RestActionContext,
    query: Query<Entity>,
  ): Query<Entity>;
}

export class RestOffsetLimitPaginator implements RestPaginator {
  readonly limitDefault = 30;
  readonly limitMax = 50;
  readonly limitParam = "limit";
  readonly offsetMax = 1000;
  readonly offsetParam = "offset";

  constructor(protected contextReader: RestActionContextReader) {}

  paginate<Entity>(
    context: RestActionContext<any>,
    query: Query<Entity>,
  ): Query<Entity> {
    const { limitDefault, limitMax, limitParam, offsetMax, offsetParam } = this;

    class PaginationQueries {
      [limitParam]: number & PositiveNoZero & Maximum<typeof limitMax> =
        limitDefault;
      [offsetParam]: number & Positive & Maximum<typeof offsetMax> = 0;
    }

    const { [limitParam]: limit, [offsetParam]: offset } =
      this.contextReader.parseQueries<PaginationQueries>(context);

    return query.limit(limit).skip(offset);
  }
}
