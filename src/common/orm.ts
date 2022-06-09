import { FilterQuery, Query } from "@deepkit/orm";

export function appendFilter<Entity>(
  query: Query<Entity>,
  filter: FilterQuery<Entity>,
): Query<Entity> {
  query = query.clone();
  query.model.filter = query.model.filter
    ? ({ $and: [query.model.filter, filter] } as any)
    : filter;
  return query;
}
