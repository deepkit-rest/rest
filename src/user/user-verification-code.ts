import { randomInt } from "crypto";
import { ExpirableMap } from "src/common/map";

import { User } from "./user.entity";

export class UserVerificationCodePool {
  private map = new ExpirableMap<User["id"], string>(1000 * 60 * 5, 10000);

  request(id: User["id"]): string {
    if (this.map.has(id))
      throw new Error("Duplicate verification code request");
    const code = this.generateCode();
    this.map.set(id, code);
    return code;
  }

  obtain(id: User["id"]): string | undefined {
    return this.map.get(id);
  }

  remove(id: User["id"]): void {
    this.map.delete(id);
  }

  private generateCode(): string {
    return "" + randomInt(100000, 999999);
  }
}
