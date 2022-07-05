import { Maximum, Positive, PositiveNoZero } from "@deepkit/type";

export interface RestList<Entity> {
  total: number;
  items: Entity[];
}

export class RestPagination {
  limit: number & PositiveNoZero & Maximum<50> = 30;
  offset: number & Positive & Maximum<1000> = 0;
}
