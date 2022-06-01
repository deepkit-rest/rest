import {
  entity,
  integer,
  Positive,
  PrimaryKey,
  Reference,
  UUID,
  uuid,
} from "@deepkit/type";
import { Entity } from "src/common/entity";
import { User } from "src/user/user.entity";

@entity.name("file-record")
export class FileRecord extends Entity<FileRecord, "owner" | "path" | "size"> {
  override id: PrimaryKey & UUID = uuid(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
  owner!: User & Reference;
  path!: string;
  size!: integer & Positive;
  contentRef?: string;
  override createdAt: Date = new Date(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
}
