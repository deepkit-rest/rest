import { ClassType } from "@deepkit/core";
import { purify } from "src/common/type";

import { RestActionContext } from "../core/rest-action";
import { RestCreationSchemaFactory } from "../crud-models/rest-creation-schema";
import { RestUpdateSchemaFactory } from "../crud-models/rest-update-schema";

export interface RestSerializationCustomizations<Entity> {
  serializer?: ClassType<RestEntitySerializer<Entity>>;
}

export interface RestEntitySerializer<Entity> {
  create(payload: Record<string, unknown>): Promise<Entity>;
  update(entity: Entity, payload: Record<string, unknown>): Promise<Entity>;
}

export class RestGenericSerializer<Entity>
  implements RestEntitySerializer<Entity>
{
  constructor(
    protected context: RestActionContext<Entity>,
    protected creationSchemaFactory: RestCreationSchemaFactory,
    protected updateSchemaFactory: RestUpdateSchemaFactory,
  ) {}

  async create(payload: Record<string, unknown>): Promise<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    if (entityType.length) {
      const message =
        "Entity constructor should take no params for generic creation";
      throw new Error(message);
    }
    const schema = this.creationSchemaFactory.build(entityType);
    const data = purify(payload, schema.type);
    const entity: Entity = new entityType();
    Object.assign(entity, data);
    return entity;
  }

  async update(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const schema = this.updateSchemaFactory.build(entityType);
    const data = purify(payload, schema.type);
    Object.assign(entity, data);
    return entity;
  }
}
