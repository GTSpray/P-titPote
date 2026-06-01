import { Migration } from "@mikro-orm/migrations";

export class Migration20260601084426 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`poll_step\` add \`description\` varchar(100) null;`,
    );
    this.addSql(
      `alter table \`poll_step\` modify \`question\` varchar(45) not null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`poll_step\` drop column \`description\`;`);
    this.addSql(
      `alter table \`poll_step\` modify \`question\` varchar(200) not null;`,
    );
  }
}
