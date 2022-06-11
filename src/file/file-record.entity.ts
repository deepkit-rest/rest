import {
  BackReference,
  entity,
  integer,
  Positive,
  Reference,
  uuid,
} from "@deepkit/type";
import { Entity } from "src/common/entity";
import { PartialRequired } from "src/common/utilities";
import { FileRecordTagPivot } from "src/core/entity-pivots";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

@entity.name("file-record").collection("file-records")
export class FileRecord extends Entity<FileRecord, "owner" | "name" | "path"> {
  override id: Entity["id"] & Filterable & Orderable = uuid(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
  owner!: User & Reference & Filterable & Orderable;
  name!: string & Filterable & Orderable;
  path!: string & Filterable & Orderable;
  tags: Tag[] & BackReference<{ via: typeof FileRecordTagPivot }> = [];
  contentKey?: string;
  contentIntegrity?: string;
  contentSize?: integer & Positive & Filterable & Orderable;
  override createdAt: Entity["createdAt"] & Filterable & Orderable = new Date(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)

  isContentDefined(): this is FileRecordContentDefined {
    return !!this.contentKey && !!this.contentIntegrity && !!this.contentSize;
  }
}

export interface FileRecordContentDefined
  extends PartialRequired<
    FileRecord,
    "contentKey" | "contentIntegrity" | "contentSize"
  > {}
