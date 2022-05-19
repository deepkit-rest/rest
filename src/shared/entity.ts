import { PrimaryKey, UUID, uuid } from "@deepkit/type";

export abstract class Entity {
  uuid: PrimaryKey & UUID = uuid();
  createdAt: Date = new Date();
  assign(data: Partial<this>): this {
    Object.assign(this, data);
    return this;
  }
}
