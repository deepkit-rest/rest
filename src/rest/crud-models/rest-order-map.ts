import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
import {
  Data,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

import { RestQueryModelFactory } from "./rest-query-model";

export type Orderable = Data<"orderable", true>;

export class RestOrderMapFactory extends RestQueryModelFactory {
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

export class RestOrderMapApplier {
  apply<Entity>(query: orm.Query<Entity>, orderMap: object): orm.Query<Entity> {
    Object.entries(orderMap).forEach(([field, order]) => {
      query = query.orderBy(field as FieldName<Entity>, order);
    });
    return query;
  }
}
