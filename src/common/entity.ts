import { FieldName } from "@deepkit/orm";
import { PrimaryKey, uuid } from "@deepkit/type";

export abstract class Entity<
  Derived extends Entity<Derived> = never,
  InputField extends FieldName<Derived> = never,
> {
  id: string & PrimaryKey = uuid(); // temporary workaround: use `string` instead of `UUID` because of UUID will sometimes fail queries https://github.com/deepkit/deepkit-framework/issues/253
  createdAt: Date = new Date();
  constructor(input: Pick<Derived, InputField>) {
    this.assign(input);
  }
  assign(input: Partial<Pick<Derived, InputField>>): this {
    Object.assign(this, input);
    return this;
  }
}
