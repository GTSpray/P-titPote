import { Migration } from '@mikro-orm/migrations';

export class Migration20260602120415 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table \`poll_resp\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`member_id\` varchar(25) not null, \`poll_step_id\` varchar(36) not null, \`poll_choice_id\` varchar(36) null, \`content\` varchar(400) null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`poll_resp\` add index \`poll_resp_poll_step_id_index\` (\`poll_step_id\`);`,
    );
    this.addSql(
      `alter table \`poll_resp\` add index \`poll_resp_poll_choice_id_index\` (\`poll_choice_id\`);`,
    );
    this.addSql(
      `alter table \`poll_resp\` add unique \`poll_resp_member_id_poll_step_id_deleted_at_unique\` (\`member_id\`, \`poll_step_id\`, \`deleted_at\`);`,
    );

    this.addSql(
      `alter table \`poll_resp\` add constraint \`poll_resp_poll_step_id_foreign\` foreign key (\`poll_step_id\`) references \`poll_step\` (\`id\`);`,
    );

    this.addSql(
      `alter table \`poll_resp\` add constraint \`poll_resp_choice_id_foreign\` foreign key (\`poll_choice_id\`) references \`poll_choice\` (\`id\`) on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`poll_resp\`;`);
  }
}
