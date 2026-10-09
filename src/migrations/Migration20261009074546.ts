import { Migration } from '@mikro-orm/migrations';

export class Migration20261009074546 extends Migration {
  override name = 'Migration20261009074546';

  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`poll_resp\` drop foreign key \`poll_resp_choice_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`poll_resp\` add constraint \`poll_resp_poll_choice_id_foreign\` foreign key (\`poll_choice_id\`) references \`poll_choice\` (\`id\`) on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`poll_resp\` drop foreign key \`poll_resp_poll_choice_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`poll_resp\` add constraint \`poll_resp_choice_id_foreign\` foreign key (\`poll_choice_id\`) references \`poll_choice\` (\`id\`) on update restrict on delete set null;`,
    );
  }
}
