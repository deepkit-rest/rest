import { PrimaryKey, UUID, uuid } from "@deepkit/type";

export abstract class Entity {
  id: PrimaryKey & UUID = uuid();
  createdAt: Date = new Date();
  assign(data: Partial<this>): this {
    Object.assign(this, data);
    return this;
  }
}
