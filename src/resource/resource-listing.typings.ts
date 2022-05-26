import { Positive } from "@deepkit/type";

export interface ResourceList<Entity> {
  total: number;
  items: Entity[];
}

export interface ResourcePagination {
  limit?: number & Positive;
  offset?: number & Positive;
}
