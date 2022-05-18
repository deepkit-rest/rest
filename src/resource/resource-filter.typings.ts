import { FieldName, QuerySelector } from "@deepkit/orm";

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

export type ResourceFilterMap<
  Entity,
  Field extends FieldName<Entity> = FieldName<Entity>,
> = {
  [Key in Field]: {
    [Operator in ResourceFilterOperator]?: Operator extends ResourceFilterOperatorMultiValue
      ? Entity[Key][]
      : Entity[Key];
  };
};
