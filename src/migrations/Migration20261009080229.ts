import { Migration } from '@mikro-orm/migrations';

export class Migration20261009080229 extends Migration {

  override name = 'Migration20261009080229';

  override up(): void | Promise<void> {
    this.addSql(`create table \`guild_trigger\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`server_id\` varchar(36) not null, \`name\` varchar(50) not null, \`kind\` varchar(32) not null, \`enabled\` tinyint(1) not null default true, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`guild_trigger\` add index \`guild_trigger_server_id_index\` (\`server_id\`);`);
    this.addSql(`alter table \`guild_trigger\` add unique \`guild_trigger_server_id_name_deleted_at_unique\` (\`server_id\`, \`name\`, \`deleted_at\`);`);

    this.addSql(`create table \`trigger_message\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`trigger_id\` varchar(36) not null, \`channel_id\` varchar(50) not null, \`message\` text not null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`trigger_message\` add unique \`trigger_message_trigger_id_unique\` (\`trigger_id\`);`);

    this.addSql(`create table \`trigger_role\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`trigger_id\` varchar(36) not null, \`role_id\` varchar(50) not null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`trigger_role\` add unique \`trigger_role_trigger_id_unique\` (\`trigger_id\`);`);

    this.addSql(`alter table \`guild_trigger\` add constraint \`guild_trigger_server_id_foreign\` foreign key (\`server_id\`) references \`discord_guild\` (\`id\`);`);

    this.addSql(`alter table \`trigger_message\` add constraint \`trigger_message_trigger_id_foreign\` foreign key (\`trigger_id\`) references \`guild_trigger\` (\`id\`) on delete cascade;`);

    this.addSql(`alter table \`trigger_role\` add constraint \`trigger_role_trigger_id_foreign\` foreign key (\`trigger_id\`) references \`guild_trigger\` (\`id\`) on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`trigger_message\` drop foreign key \`trigger_message_trigger_id_foreign\`;`);
    this.addSql(`alter table \`trigger_role\` drop foreign key \`trigger_role_trigger_id_foreign\`;`);

    this.addSql(`drop table if exists \`guild_trigger\`;`);
    this.addSql(`drop table if exists \`trigger_message\`;`);
    this.addSql(`drop table if exists \`trigger_role\`;`);
  }

}
