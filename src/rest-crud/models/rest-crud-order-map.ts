import { FieldName } from "@deepkit/orm";

export type RestCrudOrder = "asc" | "desc";

export type RestCrudOrderMap<
  Entity,
  Field extends FieldName<Entity> = FieldName<Entity>,
> = {
  [Key in Field]?: RestCrudOrder;
};
