import { Migration } from '@mikro-orm/migrations';

export class Migration20261022170446 extends Migration {
  override name = 'Migration20261022170446';

  override up(): void | Promise<void> {
    this.addSql(
      `create table \`thread_remind\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`server_id\` varchar(36) not null, \`thread_id\` varchar(50) not null, \`owner_user_id\` varchar(50) not null, \`idle_days\` smallint not null, \`next_tick_at\` datetime not null, \`last_bump_message_id\` varchar(50) null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`thread_remind\` add index \`thread_remind_server_id_index\` (\`server_id\`);`,
    );
    this.addSql(
      `alter table \`thread_remind\` add index \`thread_remind_next_tick_at_index\` (\`next_tick_at\`);`,
    );
    this.addSql(
      `alter table \`thread_remind\` add unique \`thread_remind_thread_id_deleted_at_unique\` (\`thread_id\`, \`deleted_at\`);`,
    );

    this.addSql(
      `alter table \`poll_resp\` drop foreign key \`poll_resp_choice_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`poll_resp\` add constraint \`poll_resp_poll_choice_id_foreign\` foreign key (\`poll_choice_id\`) references \`poll_choice\` (\`id\`) on delete set null;`,
    );

    this.addSql(
      `alter table \`thread_remind\` add constraint \`thread_remind_server_id_foreign\` foreign key (\`server_id\`) references \`discord_guild\` (\`id\`);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`thread_remind\`;`);

    this.addSql(
      `alter table \`poll_resp\` drop foreign key \`poll_resp_poll_choice_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`poll_resp\` add constraint \`poll_resp_choice_id_foreign\` foreign key (\`poll_choice_id\`) references \`poll_choice\` (\`id\`) on update restrict on delete set null;`,
    );
  }
}
