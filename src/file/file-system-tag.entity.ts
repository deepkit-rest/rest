import { BackReference, entity, Group, Reference } from "@deepkit/type";
import { AppEntity } from "src/core/entity";
import { FileSystemRecordToTag } from "src/core/entity-pivots";
import { FileSystemRecord } from "src/file/file-system-record.entity";
import { InCreation } from "src/rest/crud-models/rest-creation-schema";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";
import { InUpdate } from "src/rest/crud-models/rest-update-schema";
import { User } from "src/user/user.entity";

type BackRefViaPivot = BackReference<{ via: typeof FileSystemRecordToTag }>;

@entity.name("file-system-tag").collection("file-system-tags")
export class FileSystemTag extends AppEntity<FileSystemTag, "owner" | "name"> {
  owner!: User & Reference & Filterable & Orderable;
  name!: string & Filterable & Orderable & InCreation & InUpdate;
  files: FileSystemRecord[] & BackRefViaPivot & Group<"internal"> = [];
}
