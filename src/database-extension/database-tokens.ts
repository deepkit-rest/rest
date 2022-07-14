import { Inject } from "@deepkit/injector";
import { Database, DatabaseAdapter, DatabaseSession } from "@deepkit/orm";

export type InjectDatabase = Inject<Database>;
export type InjectDatabaseSession = Inject<DatabaseSession<DatabaseAdapter>>;
