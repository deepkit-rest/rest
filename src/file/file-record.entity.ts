import { entity, integer, Positive, Reference, uuid } from "@deepkit/type";
import { Entity } from "src/common/entity";
import { PartialRequired } from "src/common/utilities";
import { User } from "src/user/user.entity";

@entity.name("file-record")
export class FileRecord extends Entity<FileRecord, "owner" | "name" | "path"> {
  override id: Entity["id"] = uuid(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
  owner!: User & Reference;
  name!: string;
  path!: string;
  contentKey?: string;
  contentIntegrity?: string;
  contentSize?: integer & Positive;
  override createdAt: Entity["createdAt"] = new Date(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)

  isContentDefined(): this is FileRecordContentDefined {
    return !!this.contentKey && !!this.contentIntegrity;
  }
}

export interface FileRecordContentDefined
  extends PartialRequired<
    FileRecord,
    "contentKey" | "contentIntegrity" | "contentSize"
  > {}
