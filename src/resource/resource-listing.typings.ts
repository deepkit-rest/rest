import { PositiveNoZero } from "@deepkit/type";

export interface ResourceList<Entity> {
  total: number;
  items: Entity[];
}

export interface ResourcePagination {
  limit?: number & PositiveNoZero;
  offset?: number & PositiveNoZero;
}
