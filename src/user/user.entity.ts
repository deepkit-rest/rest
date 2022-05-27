import {
  Email,
  entity,
  Group,
  MaxLength,
  MinLength,
  Unique,
  uuid,
} from "@deepkit/type";
import { compare, hash } from "bcryptjs";
import { Entity } from "src/shared/entity";

const HASH_LENGTH = 60;

@entity.name("user")
export class User extends Entity<User, "name" | "email" | "password"> {
  override id: Entity["id"] = uuid(); // type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238), should be removed once fixed
  name!: string & MinLength<1> & MaxLength<20>;
  email!: Email & Unique;
  password!: string &
    MinLength<6> &
    MaxLength<typeof HASH_LENGTH> &
    Group<"hidden">;

  async hashPassword(): Promise<void> {
    const hashed = this.password.length === HASH_LENGTH;
    if (hashed) return;
    this.password = await hash(this.password, 10);
  }

  async verify(password: string): Promise<boolean> {
    return compare(password, this.password);
  }
}
