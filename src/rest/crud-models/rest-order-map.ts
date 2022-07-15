import {
  Data,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
  typeOf,
  validationAnnotation,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

import { RestEntityModelFactory } from "./rest-entity-model";

// TODO: move to a better place

export type Orderable = Data<"orderable", true>;

export class RestOrderMapFactory extends RestEntityModelFactory {
  protected selectFields(
    entitySchema: ReflectionClass<any>,
  ): ReflectionProperty[] {
    return entitySchema.getProperties().filter((s) => s.getData()["orderable"]);
  }

  protected processField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): ReflectionClassAddPropertyOptions {
    const regExp = /asc|desc/u;
    const annotations = {
      [validationAnnotation.symbol]: [
        { name: "pattern", args: [typeOf<typeof regExp>()] },
      ],
    };
    return {
      name: fieldSchema.name,
      type: { kind: ReflectionKind.string, annotations },
      optional: true,
    };
  }
}
