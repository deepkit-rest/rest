import { User } from "src/user/user.entity";

export class RequestContext {
  constructor() {
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) return Reflect.get(target, prop);
        throw new Error(`Property ${String(prop)} is not defined`);
      },
    });
  }
  user!: RequestUser;
}

export interface RequestUser {
  id: User["id"];
}
