import {
  deserialize,
  ReceiveType,
  ReflectionClass,
  validate,
  ValidationError,
} from "@deepkit/type";

export function purify<T extends object>(
  value: unknown,
  type?: ReceiveType<T>,
): T {
  if (!type) throw new Error("Type not specified");
  const result = deserialize(value, undefined, undefined, undefined, type);
  const errors = validate(result, type);
  if (errors.length) throw new ValidationError(errors);
  return result;
}

export type ReflectionClassAddPropertyOptions = Parameters<
  ReflectionClass<any>["addProperty"]
>[0];
