import { FieldName, QuerySelector } from "@deepkit/orm";

import { ResourceFilterMapFactory } from "./resource-filter-map-factory";

export type ResourceFilterOperator = Extract<
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

export type ResourceFilterOperatorMultiValue = Extract<
  ResourceFilterOperator,
  "$in" | "$nin"
>;

// jsdoc link
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
ResourceFilterMapFactory;

/**
 * @deprecated - Use {@link ResourceFilterMapFactory} instead. It's
 * impossible to implement relation field filtering via pure-types because
 * DeepKit removes the types of type-decorators at runtime.
 */
export type ResourceFilterMap<
  Entity,
  Field extends FieldName<Entity> = FieldName<Entity>,
> = {
  [Key in Field]?: {
    [Operator in ResourceFilterOperator]?: Operator extends ResourceFilterOperatorMultiValue
      ? Entity[Key][]
      : Entity[Key];
  };
};
