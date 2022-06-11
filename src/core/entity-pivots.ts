import { entity, Reference, uuid } from "@deepkit/type";
import { Entity } from "src/common/entity";
import { FileRecord } from "src/file/file-record.entity";
import { Tag } from "src/tag/tag.entity";

@entity.name("file-record__tag__pivot")
export class FileRecordTagPivot extends Entity<FileRecordTagPivot> {
  override id: Entity["id"] = uuid(); // temporary workaround: type info is lost during class inheritances  (https://github.com/deepkit/deepkit-framework/issues/238)
  file!: FileRecord & Reference;
  tag!: Tag & Reference;
  override createdAt: Entity["createdAt"] = new Date(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
}
