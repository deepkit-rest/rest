import {
  BackReference,
  Email,
  entity,
  Group,
  MaxLength,
  MinLength,
  Unique,
  uuid,
} from "@deepkit/type";
import { compare, hash } from "bcryptjs";
import { Entity } from "src/common/entity";
import { FileRecord } from "src/file/file-record.entity";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";

const HASH_LENGTH = 60;

@entity.name("user").collection("users")
export class User extends Entity<User, "name" | "email" | "password"> {
  override id: Entity["id"] & Filterable & Orderable = uuid(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
  name!: string & MinLength<1> & MaxLength<20> & Filterable & Orderable;
  email!: Email & Unique & Filterable & Orderable;
  password!: string &
    MinLength<6> &
    MaxLength<typeof HASH_LENGTH> &
    Group<"hidden">;
  files: FileRecord[] & BackReference = [];
  verifiedAt?: Date;
  override createdAt: Entity["createdAt"] & Filterable & Orderable = new Date(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)

  async hashPassword(): Promise<void> {
    const hashed = this.password.length === HASH_LENGTH;
    if (hashed) return;
    this.password = await hash(this.password, 10);
  }

  async verify(password: string): Promise<boolean> {
    return compare(password, this.password);
  }
}
