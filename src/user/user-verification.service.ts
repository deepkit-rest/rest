import { ExpirableMap } from "src/common/map";
import { randomInt } from "src/common/utilities";
import { EmailEngine } from "src/email-engine/email-engine.interface";

import { User } from "./user.entity";

export class UserVerificationService {
  private map = new ExpirableMap<User["id"], string>(1000 * 60 * 5, 10000);

  constructor(private mailer: EmailEngine) {}

  request(id: User["id"]): void {
    if (this.map.has(id)) throw new Error("Duplicate request");
    const code = this.generateCode();
    this.map.set(id, code);
  }

  async mail(id: User["id"], email: string): Promise<void> {
    const code = this.map.get(id);
    await this.mailer.send({
      subject: "Verify Your Email",
      content: `Verification Code: ${code}`,
      contentInHtml: `Verification Code: <b>${code}</b>`,
      recipients: [{ address: email }],
    });
  }

  exists(id: User["id"]): boolean {
    return this.map.has(id);
  }

  confirm(id: User["id"], code: string): boolean {
    const codeExpected = this.map.get(id);
    if (code !== codeExpected) return false;
    this.map.delete(id);
    return true;
  }

  private generateCode(): string {
    return "" + randomInt(100000, 999999);
  }
}
