import { ClassType } from "@deepkit/core";
import { FileRecord } from "src/file/file-record.entity";
import { User } from "src/user/user.entity";

export const entities: ClassType[] = [User, FileRecord];
