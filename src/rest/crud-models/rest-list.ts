import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { Maximum, Positive, PositiveNoZero } from "@deepkit/type";

export interface RestList<Entity> {
  total: number;
  items: Entity[];
}

export class RestPagination {
  limit: number & PositiveNoZero & Maximum<50> = 30;
  offset: number & Positive & Maximum<1000> = 0;
}

export class RestPaginationApplier {
  apply<Entity>(
    query: orm.Query<Entity>,
    { limit, offset }: RestPagination,
  ): orm.Query<Entity> {
    if (limit) query = query.limit(limit);
    if (offset) query = query.skip(offset);
    return query;
  }
}
