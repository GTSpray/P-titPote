import { Migration } from '@mikro-orm/migrations';

export class Migration20260911160000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table \`thread_remind\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`server_id\` varchar(36) not null, \`thread_id\` varchar(50) not null, \`owner_user_id\` varchar(50) not null, \`idle_days\` smallint not null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`thread_remind\` add index \`thread_remind_server_id_index\` (\`server_id\`);`,
    );
    this.addSql(
      `alter table \`thread_remind\` add unique \`thread_remind_thread_id_deleted_at_unique\` (\`thread_id\`, \`deleted_at\`);`,
    );
    this.addSql(
      `alter table \`thread_remind\` add constraint \`thread_remind_server_id_foreign\` foreign key (\`server_id\`) references \`discord_guild\` (\`id\`);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`thread_remind\` drop foreign key \`thread_remind_server_id_foreign\`;`,
    );
    this.addSql(`drop table if exists \`thread_remind\`;`);
  }
}
