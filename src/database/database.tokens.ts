import { Inject } from "@deepkit/injector";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release

// temporary workaround: when database is provided using a class extending
// `Database`, and some entities is extending a base class and passing generic
// type arguments, the debugger will fail to work
// https://github.com/deepkit/deepkit-framework/issues/241
export const DATABASE = "token:database"; // temporary workaround: type `symbol` is missing in type `ExportType`, so we use string instead
export class DatabaseFactoryToken {} // temporary workaround for https://github.com/deepkit/deepkit-framework/issues/240
export type InjectDatabase = Inject<orm.Database, typeof DATABASE>;

// temporary workaround: `Database` cannot be used as a token when framework
// debug mode is enabled
export const DATABASE_SESSION = "token:database-session"; // temporary workaround: type `symbol` is missing in type `ExportType`, so we use string instead
export type InjectDatabaseSession = Inject<
  orm.DatabaseSession<orm.DatabaseAdapter>,
  typeof DATABASE_SESSION
>;
