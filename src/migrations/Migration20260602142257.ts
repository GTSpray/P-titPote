import { Migration } from '@mikro-orm/migrations';

export class Migration20260602142257 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`message_aliased\` drop foreign key \`message_aliased_server_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`message_aliased\` add constraint \`message_aliased_server_id_foreign\` foreign key (\`server_id\`) references \`discord_guild\` (\`id\`);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`message_aliased\` drop foreign key \`message_aliased_server_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`message_aliased\` add constraint \`message_aliased_server_id_foreign\` foreign key (\`server_id\`) references \`discord_guild\` (\`id\`) on update cascade on delete restrict;`,
    );
  }
}
