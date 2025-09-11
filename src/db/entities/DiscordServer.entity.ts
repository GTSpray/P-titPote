import { EntityBase } from "../EntityBase.js";
import { Entity, Property, types } from "@mikro-orm/mysql";

@Entity()
export class DiscordServer extends EntityBase {
  @Property({ unique: true, type: "varchar", length: 50 })
  serverId = "";
}
