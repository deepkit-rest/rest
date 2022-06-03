import { entity, integer, Positive, Reference, uuid } from "@deepkit/type";
import { Entity } from "src/common/entity";
import { User } from "src/user/user.entity";

@entity.name("file-record")
export class FileRecord extends Entity<
  FileRecord,
  "owner" | "name" | "path" | "size"
> {
  override id: Entity["id"] = uuid(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
  owner!: User & Reference;
  name!: string;
  path!: string;
  size!: integer & Positive;
  contentRef?: string;
  override createdAt: Entity["createdAt"] = new Date(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
}
