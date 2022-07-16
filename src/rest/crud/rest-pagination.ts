import { ClassType } from "@deepkit/core";
import { Query } from "@deepkit/orm";
import { Maximum, Positive, PositiveNoZero } from "@deepkit/type";
import { purify } from "src/common/type";

import { RestActionContext } from "../core/rest-action";
import { RestQueryProcessor } from "./rest-crud";

export interface RestPaginationCustomizations {
  paginator?: ClassType<RestQueryProcessor>;
}

export class RestOffsetLimitPaginator implements RestQueryProcessor {
  limitDefault = 30;
  limitMax = 50;
  limitParam = "limit";
  offsetMax = 1000;
  offsetParam = "offset";

  constructor(protected context: RestActionContext) {}

  process<Entity>(query: Query<Entity>): Query<Entity> {
    const { limitDefault, limitMax, limitParam, offsetMax, offsetParam } = this;

    type Limit = number & PositiveNoZero & Maximum<typeof limitMax>;
    type Offset = number & Positive & Maximum<typeof offsetMax>;

    const queries = this.context.getRequestQueries();
    const limit = purify<Limit>(queries[limitParam] ?? limitDefault);
    const offset = purify<Offset>(queries[offsetParam] ?? 0);

    return query.limit(limit).skip(offset);
  }
}
