import { FieldName, QuerySelector } from "@deepkit/orm";

import { RestCrudFilterMapFactory } from "./rest-crud-filter-map-factory";

export type RestCrudFilterOperator = Extract<
  keyof QuerySelector<unknown>,
  | "$eq"
  | "$gt"
  | "$gte"
  | "$in"
  | "$lt"
  | "$lte"
  | "$ne"
  | "$nin"
  | "$not"
  | "$regex"
>;

export type RestCrudFilterOperatorMultiValue = Extract<
  RestCrudFilterOperator,
  "$in" | "$nin"
>;

// jsdoc link
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
RestCrudFilterMapFactory;

/**
 * @deprecated - Use {@link RestCrudFilterMapFactory} instead. It's
 * impossible to implement relation field filtering via pure-types because
 * DeepKit removes the types of type-decorators at runtime.
 */
export type RestCrudFilterMap<
  Entity,
  Field extends FieldName<Entity> = FieldName<Entity>,
> = {
  [Key in Field]?: {
    [Operator in RestCrudFilterOperator]?: Operator extends RestCrudFilterOperatorMultiValue
      ? Entity[Key][]
      : Entity[Key];
  };
};
