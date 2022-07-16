import { ClassType } from "@deepkit/core";
import { FieldName } from "@deepkit/orm";
import { PrimaryKey, uuid } from "@deepkit/type";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";

export abstract class Entity<
  Derived extends Entity<Derived> = never,
  InputField extends FieldName<Derived> = never,
> {
  id: string & PrimaryKey & Filterable & Orderable = uuid(); // temporary workaround: use `string` instead of `UUID` because of UUID will sometimes fail queries https://github.com/deepkit/deepkit-framework/issues/253
  createdAt: Date & Filterable & Orderable = new Date();
  constructor(input: Pick<Derived, InputField>) {
    this.assign(input);
  }
  assign(input: Partial<Pick<Derived, InputField>>): this {
    Object.assign(this, input);
    return this;
  }
}

export interface EntityType<
  Derived extends Entity<Derived> = never,
  InputField extends FieldName<Derived> = never,
> {
  new (input: Pick<Derived, InputField>): Entity<Derived, InputField>;
}

export function isEntityType(classType: ClassType): classType is EntityType {
  return classType.prototype instanceof Entity;
}
