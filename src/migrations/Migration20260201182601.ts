import { Migration } from "@mikro-orm/migrations";

export class Migration20260201182601 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
  CREATE TABLE \`poll\` (
    \`id\` VARCHAR(36) NOT NULL,
    \`created_at\` DATETIME NOT NULL,
    \`updated_at\` DATETIME NOT NULL,
    \`deleted_at\` DATETIME NOT NULL,
    \`server_id\` VARCHAR(36) NOT NULL,
    \`question\` VARCHAR(200) NOT NULL,
    \`role\` VARCHAR(50) NULL,
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 engine = InnoDB;`);

    this.addSql(`ALTER TABLE \`poll\` 
        ADD INDEX \`poll_server_id_index\`(\`server_id\`);`);
    this.addSql(`ALTER TABLE \`poll\` 
        ADD CONSTRAINT \`poll_server_id_foreign\` 
        FOREIGN KEY (\`server_id\`) 
        REFERENCES \`discord_guild\` (\`id\`) 
        ON UPDATE CASCADE;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS \`poll\`;`);
  }
}
