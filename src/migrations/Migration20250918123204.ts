import { Migration } from "@mikro-orm/migrations";

export class Migration20250918123204 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
CREATE TABLE \`discord_guild\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime NOT NULL,
  \`updated_at\` datetime NOT NULL,
  \`deleted_at\` datetime NOT NULL,
  \`guild_id\` varchar(50) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`discord_guild_guild_id_deleted_at_unique\` (\`guild_id\`,\`deleted_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
     `);

    this.addSql(`
CREATE TABLE \`message_aliased\` (
  \`id\` varchar(36) NOT NULL,
  \`created_at\` datetime NOT NULL,
  \`updated_at\` datetime NOT NULL,
  \`deleted_at\` datetime NOT NULL,
  \`server_id\` varchar(36) NOT NULL,
  \`alias\` varchar(50) NOT NULL,
  \`message\` text NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`message_aliased_server_id_alias_deleted_at_unique\` (\`server_id\`,\`alias\`,\`deleted_at\`),
  KEY \`message_aliased_server_id_index\` (\`server_id\`),
  CONSTRAINT \`message_aliased_server_id_foreign\` FOREIGN KEY (\`server_id\`) REFERENCES \`discord_guild\` (\`id\`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
 `);
  }

  override async down(): Promise<void> {
    this.addSql("DROP TABLE `message_aliased`;");
    this.addSql("DROP TABLE `discord_guild`;");
  }
}
