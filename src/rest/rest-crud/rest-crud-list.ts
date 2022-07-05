import { Maximum, Positive, PositiveNoZero } from "@deepkit/type";

export interface RestCrudList<Entity> {
  total: number;
  items: Entity[];
}

export class RestCrudPagination {
  limit: number & PositiveNoZero & Maximum<50> = 30;
  offset: number & Positive & Maximum<1000> = 0;
}
