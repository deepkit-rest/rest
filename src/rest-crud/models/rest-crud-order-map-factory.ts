import {
  Data,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

import { RestCrudQueryModelFactory } from "./rest-crud-query-model-factory";

export type Orderable = Data<"orderable", true>;

export class RestCrudOrderMapFactory extends RestCrudQueryModelFactory {
  protected selectFields(
    entitySchema: ReflectionClass<any>,
  ): ReflectionProperty[] {
    return entitySchema.getProperties().filter((s) => s.getData()["orderable"]);
  }

  protected processField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): ReflectionClassAddPropertyOptions {
    return {
      name: fieldSchema.name,
      type: {
        kind: ReflectionKind.union,
        types: [
          { kind: ReflectionKind.literal, literal: "asc" },
          { kind: ReflectionKind.literal, literal: "desc" },
        ],
      },
      optional: true,
    };
  }
}
