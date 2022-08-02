import { ClassType } from "@deepkit/core";
import { ReflectionClass, serialize } from "@deepkit/type";
import { purify } from "@deepkit-rest/common";
import { HttpRouteConfig } from "@deepkit-rest/http-extension";

import { RestCreationSchemaFactory } from "./models/rest-creation-schema";
import { RestUpdateSchemaFactory } from "./models/rest-update-schema";
import { RestCrudActionContext } from "./rest-crud-kernel";

export interface RestSerializationCustomizations<Entity> {
  serializer?: ClassType<RestEntitySerializer<Entity>>;
}

export interface RestEntitySerializer<Entity> {
  /**
   * Transform the entity into a JSON serializable plain object to form the
   * response body.
   * @param entity
   */
  serialize(entity: Entity): Promise<unknown>;
  /**
   * Create a new entity instance based on the payload data which came
   * from the request body.
   * @param payload
   */
  deserializeCreation(payload: Record<string, unknown>): Promise<Entity>;
  /**
   * Update an existing entity instance based on the payload data which came
   * from the request body.
   * @param payload
   */
  deserializeUpdate(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity>;
}

export class RestGenericSerializer<Entity>
  implements RestEntitySerializer<Entity>
{
  constructor(
    protected context: RestCrudActionContext<Entity>,
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
    const schema = this.createCreationSchema(entityType);
    const data = purify<Partial<Entity>>(payload, schema.type);
    return this.createEntity(data);
  }

  async deserializeUpdate(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const schema = this.createUpdateSchema(entityType);
    const data = purify<Partial<Entity>>(payload, schema.type);
    return this.updateEntity(entity, data);
  }

  protected createCreationSchema(
    entityType: ClassType<Entity>,
  ): ReflectionClass<any> {
    return this.creationSchemaFactory.build(entityType);
  }

  protected createUpdateSchema(
    entityType: ClassType<Entity>,
  ): ReflectionClass<any> {
    return this.updateSchemaFactory.build(entityType);
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
