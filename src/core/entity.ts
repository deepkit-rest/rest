import { ClassType } from "@deepkit/core";
import { PrimaryKey, uuid } from "@deepkit/type";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";

/**
 * The constructor of all derived classes must have a parameter named `input`
 * with proper type to initialize properties.
 * @example
 *  class MyEntity extends AppEntity {
 *    name!: string;
 *    constructor(input: Pick<MyEntity, "name">) {
 *      super()
 *      this.assign(input);
 *    }
 *  }
 */
export abstract class AppEntity<Derived extends AppEntity<Derived>> {
  id: string & PrimaryKey & Filterable & Orderable = uuid(); // temporary workaround: use `string` instead of `UUID` because of UUID will sometimes fail queries https://github.com/deepkit/deepkit-framework/issues/253
  createdAt: Date & Filterable & Orderable = new Date();
  assign(input: Partial<Derived>): this {
    Object.assign(this, input);
    return this;
  }
}

export interface AppEntityType<Derived extends AppEntity<Derived> = never> {
  new (input: object): AppEntity<Derived>;
}

export function isAppEntityType(
  classType: ClassType,
): classType is AppEntityType {
  return classType.prototype instanceof AppEntity;
}
