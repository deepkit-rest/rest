import { ClassType } from "@deepkit/core";
import { purify } from "src/common/type";

import { RestActionContext } from "../core/rest-action";
import { RestCreationSchemaFactory } from "../crud-models/rest-creation-schema";
import { RestUpdateSchemaFactory } from "../crud-models/rest-update-schema";
import { RestCrudService } from "./rest-crud";

export interface RestSerializationCustomizations<Entity> {
  serializer?: ClassType<RestSerializer<Entity>>;
}

export interface RestSerializer<Value> {
  serialize(value: Value): Promise<unknown>;
  deserialize(value: unknown): Promise<Value>;
}

export abstract class RestEntitySerializer<Entity>
  implements RestSerializer<Entity>
{
  constructor(
    protected context: RestActionContext,
    protected crud: RestCrudService,
  ) {}

  async serialize(value: Entity): Promise<unknown> {
    return value;
  }
  async deserialize(value: unknown): Promise<Entity> {
    const payload = purify<Record<string, any>>(value);
    const isDetailAction = this.context.getActionMeta().detailed;
    if (!isDetailAction) return this.create(payload);
    const entity = await this.crud.retrieve<Entity>();
    return this.update(entity, payload);
  }

  protected abstract create(payload: Record<string, unknown>): Promise<Entity>;
  protected abstract update(
    entity: Entity,
    payload: Record<string, unknown>,
  ): Promise<Entity>;
}

export class RestGenericEntitySerializer<
  Entity,
> extends RestEntitySerializer<Entity> {
  constructor(
    context: RestActionContext<Entity>,
    crud: RestCrudService,
    protected creationSchemaFactory: RestCreationSchemaFactory,
    protected updateSchemaFactory: RestUpdateSchemaFactory,
  ) {
    super(context, crud);
  }

  protected async create(payload: Record<string, unknown>): Promise<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const schema = this.creationSchemaFactory.build(entityType);
    const data = purify<Partial<Entity>>(payload, schema.type);
    return this.createEntity(data);
  }

  protected async update(
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
