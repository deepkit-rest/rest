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
import { AppEntity } from "src/core/entity";
import { FileRecord } from "src/file/file-record.entity";
import { InCreation } from "src/rest/crud-models/rest-creation-schema";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";
import { InUpdate } from "src/rest/crud-models/rest-update-schema";

const HASH_LENGTH = 60;

// prettier-ignore
@entity.name("user").collection("users")
export class User extends AppEntity<User, "name" | "email" | "password"> {
  name!: string & MinLength<1> & MaxLength<20> & Filterable & Orderable & InCreation & InUpdate;
  email!: Email & Unique & Filterable & Orderable & InCreation & InUpdate;
  password!: string & MinLength<6> & MaxLength<typeof HASH_LENGTH> & InCreation & InUpdate & Group<"hidden">;
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
