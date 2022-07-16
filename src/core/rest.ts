import { RestGenericSerializer } from "src/rest/crud/rest-serialization";

import { Entity, isEntityType } from "./entity";

export abstract class AppEntitySerializer<
  E extends Entity<E>,
> extends RestGenericSerializer<E> {
  protected override createEntity(data: Partial<E>): E {
    const entityType = this.context.getEntitySchema().getClassType();
    if (!isEntityType(entityType)) throw new Error("Invalid entity class");
    return new entityType(data) as E;
  }

  protected override updateEntity(entity: E, data: Partial<E>): E {
    return entity.assign(data);
  }
}
