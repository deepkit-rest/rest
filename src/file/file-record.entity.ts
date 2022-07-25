import {
  BackReference,
  entity,
  Group,
  integer,
  Positive,
  Reference,
} from "@deepkit/type";
import { PartialRequired } from "src/common/utilities";
import { AppEntity } from "src/core/entity";
import { FileRecordToTag } from "src/core/entity-pivots";
import { InCreation } from "src/rest/crud-models/rest-creation-schema";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";
import { InUpdate } from "src/rest/crud-models/rest-update-schema";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

type BackRefViaPivot = BackReference<{ via: typeof FileRecordToTag }>;

@entity.name("file-record").collection("file-records")
export class FileRecord extends AppEntity<
  FileRecord,
  "owner" | "name" | "path"
> {
  owner!: User & Reference & Filterable & Orderable;
  name!: string & Filterable & Orderable & InCreation & InUpdate;
  path!: string & Filterable & Orderable & InCreation & InUpdate;
  tags: Tag[] & BackRefViaPivot & Group<"internal"> = [];
  contentKey?: string = undefined;
  contentIntegrity?: string = undefined;
  contentSize?: integer & Positive & Filterable & Orderable = undefined;

  isContentDefined(): this is FileRecordContentDefined {
    return !!this.contentKey && !!this.contentIntegrity && !!this.contentSize;
  }
}

export interface FileRecordContentDefined
  extends PartialRequired<
    FileRecord,
    "contentKey" | "contentIntegrity" | "contentSize"
  > {}
