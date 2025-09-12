import { EntityBase } from "../EntityBase.js";
import { Entity, Property, types } from "@mikro-orm/mysql";

@Entity()
export class DiscordGuild extends EntityBase {
  @Property({ unique: true, type: "varchar", length: 50 })
  guildId = "";
}
