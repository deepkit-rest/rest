import { entity } from "@deepkit/type";
import { Entity } from "src/shared/entity";

@entity.name("user")
export class User extends Entity {
  name!: string;
  email!: string;
}
