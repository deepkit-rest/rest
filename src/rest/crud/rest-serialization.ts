import { ClassType } from "@deepkit/core";
import { serialize } from "@deepkit/type";
import { purify } from "src/common/type";
import { HttpRouteConfig } from "src/http-extension/http-common";

import { RestActionContext } from "../core/rest-action";
import { RestCreationSchemaFactory } from "../crud-models/rest-creation-schema";
import { RestUpdateSchemaFactory } from "../crud-models/rest-update-schema";

export interface RestSerializationCustomizations<Entity> {
  serializer?: ClassType<RestEntitySerializer<Entity>>;
}

export interface RestEntitySerializer<Entity> {
  serialize(entity: Entity): Promise<unknown>;
  deserializeCreation(payload: Record<string, unknown>): Promise<Entity>;
  deserializeUpdate(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity>;
}

export class RestGenericSerializer<Entity>
  implements RestEntitySerializer<Entity>
{
  constructor(
    protected context: RestActionContext<Entity>,
    protected routeConfig: HttpRouteConfig,
    protected creationSchemaFactory: RestCreationSchemaFactory,
    protected updateSchemaFactory: RestUpdateSchemaFactory,
  ) {}

  async serialize(entity: Entity): Promise<unknown> {
    const entitySchema = this.context.getEntitySchema();
    const { serializer, serializationOptions } = this.routeConfig;
    return serialize<Entity>(
      entity,
      serializationOptions,
      serializer,
      undefined,
      entitySchema.type,
    );
  }

  async deserializeCreation(payload: Record<string, unknown>): Promise<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const schema = this.creationSchemaFactory.build(entityType);
    const data = purify<Partial<Entity>>(payload, schema.type);
    return this.createEntity(data);
  }

  async deserializeUpdate(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const schema = this.updateSchemaFactory.build(entityType);
    const data = purify<Partial<Entity>>(payload, schema.type);
    return this.updateEntity(entity, data);
  }

  protected createEntity(data: Partial<Entity>): Entity {
    const entityType = this.context.getEntitySchema().getClassType();
    if (entityType.length) {
      const message =
        "Entity constructor should take no params for generic creation";
      throw new Error(message);
    }
    const entity: Entity = new entityType();
    Object.assign(entity, data);
    return entity;
  }

  protected updateEntity(entity: Entity, data: Partial<Entity>): Entity {
    Object.assign(entity, data);
    return entity;
  }
}
