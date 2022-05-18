export interface ResourceList<Entity> {
  total: number;
  items: Entity[];
}

export interface ResourcePagination {
  limit?: number;
  offset?: number;
}
