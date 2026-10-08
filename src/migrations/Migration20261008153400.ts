import { Migration } from '@mikro-orm/migrations';

export class Migration20261008153400 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table \`guild_trigger\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`server_id\` varchar(36) not null, \`name\` varchar(50) not null, \`kind\` varchar(32) not null, \`enabled\` tinyint(1) not null default 1, \`channel_id\` varchar(50) null, \`message\` text null, \`role_id\` varchar(50) null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`guild_trigger\` add index \`guild_trigger_server_id_index\` (\`server_id\`);`,
    );
    this.addSql(
      `alter table \`guild_trigger\` add unique \`guild_trigger_server_id_name_deleted_at_unique\` (\`server_id\`, \`name\`, \`deleted_at\`);`,
    );
    this.addSql(
      `alter table \`guild_trigger\` add constraint \`guild_trigger_server_id_foreign\` foreign key (\`server_id\`) references \`discord_guild\` (\`id\`);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`guild_trigger\` drop foreign key \`guild_trigger_server_id_foreign\`;`,
    );
    this.addSql(`drop table if exists \`guild_trigger\`;`);
  }
}
