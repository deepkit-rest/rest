import {
  BackReference,
  Email,
  entity,
  Group,
  MaxLength,
  MinLength,
  Unique,
} from "@deepkit/type";
import { compare, hash } from "bcryptjs";
import { Entity } from "src/core/entity";
import { FileRecord } from "src/file/file-record.entity";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";

const HASH_LENGTH = 60;

@entity.name("user").collection("users")
export class User extends Entity<User, "name" | "email" | "password"> {
  name!: string & MinLength<1> & MaxLength<20> & Filterable & Orderable;
  email!: Email & Unique & Filterable & Orderable;
  password!: string &
    MinLength<6> &
    MaxLength<typeof HASH_LENGTH> &
    Group<"hidden">;
  files: FileRecord[] & BackReference & Group<"hidden"> = [];
  verifiedAt?: Date = undefined;

  async hashPassword(): Promise<void> {
    const hashed = this.password.length === HASH_LENGTH;
    if (hashed) return;
    this.password = await hash(this.password, 10);
  }

  async verify(password: string): Promise<boolean> {
    return compare(password, this.password);
  }
}
