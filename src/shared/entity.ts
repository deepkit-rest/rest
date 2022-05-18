import { PrimaryKey, UUID, uuid } from "@deepkit/type";

export abstract class Entity {
  uuid: PrimaryKey & UUID = uuid();
  createdAt: Date = new Date();
}
