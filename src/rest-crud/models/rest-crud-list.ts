import { Positive, PositiveNoZero } from "@deepkit/type";

export interface RestCrudList<Entity> {
  total: number;
  items: Entity[];
}

export interface RestCrudPagination {
  limit: number & PositiveNoZero;
  offset: number & Positive;
}
