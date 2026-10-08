import { Migration } from '@mikro-orm/migrations';

export class Migration20261008175800 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table \`trigger_message\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`trigger_id\` varchar(36) not null, \`channel_id\` varchar(50) not null, \`message\` text not null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`trigger_message\` add unique \`trigger_message_trigger_id_unique\` (\`trigger_id\`);`,
    );

    this.addSql(
      `create table \`trigger_role\` (\`id\` varchar(36) not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`deleted_at\` datetime not null, \`trigger_id\` varchar(36) not null, \`role_id\` varchar(50) not null, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`trigger_role\` add unique \`trigger_role_trigger_id_unique\` (\`trigger_id\`);`,
    );

    this.addSql(
      `alter table \`trigger_message\` add constraint \`trigger_message_trigger_id_foreign\` foreign key (\`trigger_id\`) references \`guild_trigger\` (\`id\`) on delete cascade;`,
    );
    this.addSql(
      `alter table \`trigger_role\` add constraint \`trigger_role_trigger_id_foreign\` foreign key (\`trigger_id\`) references \`guild_trigger\` (\`id\`) on delete cascade;`,
    );

    this.addSql(
      `insert into \`trigger_message\` (\`id\`, \`created_at\`, \`updated_at\`, \`deleted_at\`, \`trigger_id\`, \`channel_id\`, \`message\`)
       select uuid(), \`created_at\`, \`updated_at\`, \`deleted_at\`, \`id\`, \`channel_id\`, \`message\`
       from \`guild_trigger\`
       where \`kind\` = 'welcome_message' and \`channel_id\` is not null and \`message\` is not null;`,
    );
    this.addSql(
      `insert into \`trigger_role\` (\`id\`, \`created_at\`, \`updated_at\`, \`deleted_at\`, \`trigger_id\`, \`role_id\`)
       select uuid(), \`created_at\`, \`updated_at\`, \`deleted_at\`, \`id\`, \`role_id\`
       from \`guild_trigger\`
       where \`kind\` = 'welcome_role' and \`role_id\` is not null;`,
    );

    this.addSql(`alter table \`guild_trigger\` drop column \`channel_id\`;`);
    this.addSql(`alter table \`guild_trigger\` drop column \`message\`;`);
    this.addSql(`alter table \`guild_trigger\` drop column \`role_id\`;`);
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`guild_trigger\` add \`channel_id\` varchar(50) null;`,
    );
    this.addSql(`alter table \`guild_trigger\` add \`message\` text null;`);
    this.addSql(
      `alter table \`guild_trigger\` add \`role_id\` varchar(50) null;`,
    );

    this.addSql(
      `update \`guild_trigger\` g
       inner join \`trigger_message\` m on m.\`trigger_id\` = g.\`id\`
       set g.\`channel_id\` = m.\`channel_id\`, g.\`message\` = m.\`message\`;`,
    );
    this.addSql(
      `update \`guild_trigger\` g
       inner join \`trigger_role\` r on r.\`trigger_id\` = g.\`id\`
       set g.\`role_id\` = r.\`role_id\`;`,
    );

    this.addSql(
      `alter table \`trigger_message\` drop foreign key \`trigger_message_trigger_id_foreign\`;`,
    );
    this.addSql(
      `alter table \`trigger_role\` drop foreign key \`trigger_role_trigger_id_foreign\`;`,
    );
    this.addSql(`drop table if exists \`trigger_message\`;`);
    this.addSql(`drop table if exists \`trigger_role\`;`);
  }
}
