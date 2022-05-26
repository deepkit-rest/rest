import { FieldName } from "@deepkit/orm";
import { PrimaryKey, UUID, uuid } from "@deepkit/type";

export abstract class Entity<
  Derived extends Entity<Derived> = never,
  InputField extends FieldName<Derived> = never,
> {
  id: PrimaryKey & UUID = uuid();
  createdAt: Date = new Date();
  constructor(input: Pick<Derived, InputField>) {
    this.assign(input);
  }
  assign(input: Partial<Pick<Derived, InputField>>): this {
    Object.assign(this, input);
    return this;
  }
}
