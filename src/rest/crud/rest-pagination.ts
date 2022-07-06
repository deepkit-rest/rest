import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { Maximum, Positive, PositiveNoZero } from "@deepkit/type";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";

export interface RestPaginationCustomizations {
  paginator?: RestPaginator;
}

export interface RestPaginator {
  paginate<Entity>(
    context: RestActionContext,
    query: orm.Query<Entity>,
  ): orm.Query<Entity>;
}

export class RestNoopPaginator implements RestPaginator {
  paginate<Entity>(
    context: RestActionContext<any>,
    query: orm.Query<Entity>,
  ): orm.Query<Entity> {
    return query;
  }
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
    query: orm.Query<Entity>,
  ): orm.Query<Entity> {
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
