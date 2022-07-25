import { BackReference, entity, Group, Reference } from "@deepkit/type";
import { AppEntity } from "src/core/entity";
import { FileRecordToTag } from "src/core/entity-pivots";
import { FileRecord } from "src/file/file-record.entity";
import { InCreation } from "src/rest/crud-models/rest-creation-schema";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";
import { InUpdate } from "src/rest/crud-models/rest-update-schema";
import { User } from "src/user/user.entity";

type BackRefViaPivot = BackReference<{ via: typeof FileRecordToTag }>;

@entity.name("tag").collection("tags")
export class Tag extends AppEntity<Tag, "owner" | "name"> {
  owner!: User & Reference & Filterable & Orderable;
  name!: string & Filterable & Orderable & InCreation & InUpdate;
  files: FileRecord[] & BackRefViaPivot & Group<"internal"> = [];
}
