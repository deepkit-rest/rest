import { FieldName } from "@deepkit/orm";

export type ResourceOrder = "asc" | "desc";

export type ResourceOrderMap<
  Entity,
  Field extends FieldName<Entity> = FieldName<Entity>,
> = {
  [Key in Field]?: ResourceOrder;
};
