import { Migration } from "@mikro-orm/migrations";

export class Migration20260201182601 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`poll\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`server_id\` varchar(36) not null, \`title\` varchar(45) not null,\`question\` varchar(200) not null, \`role\` varchar(50) null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`poll\` add index \`poll_server_id_index\`(\`server_id\`);`,
    );

    this.addSql(
      `create table \`poll_choice\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`poll_id\` varchar(36) not null, \`label\` varchar(200) not null, \`order\` smallint not null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`poll_choice\` add index \`poll_choice_poll_id_index\`(\`poll_id\`);`,
    );
    this.addSql(
      `alter table \`poll_choice\` add unique \`poll_choice_poll_id_order_unique\`(\`poll_id\`, \`order\`);`,
    );

    this.addSql(
      `alter table \`poll\` add constraint \`poll_server_id_foreign\` foreign key (\`server_id\`) references \`discord_guild\` (\`id\`) on update cascade;`,
    );

    this.addSql(
      `alter table \`poll_choice\` add constraint \`poll_choice_poll_id_foreign\` foreign key (\`poll_id\`) references \`poll\` (\`id\`) on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table \`poll_choice\` drop foreign key \`poll_choice_poll_id_foreign\`;`,
    );

    this.addSql(`drop table if exists \`poll\`;`);

    this.addSql(`drop table if exists \`poll_choice\`;`);
  }
}
