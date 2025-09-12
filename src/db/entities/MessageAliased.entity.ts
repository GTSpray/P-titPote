import { EntityBase } from "../EntityBase.js";
import { Entity, ManyToOne, Property, types } from "@mikro-orm/mysql";
import { DiscordGuild } from "./DiscordGuild.entity.js";

@Entity()
export class MessageAliased extends EntityBase {
  @ManyToOne({ entity: () => DiscordGuild, nullable: false })
  server!: DiscordGuild;

  @Property({ type: "varchar", length: 20 })
  alias = "";

  @Property({ type: types.text })
  message = "";
}
