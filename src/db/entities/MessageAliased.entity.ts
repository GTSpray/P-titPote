import { EntityBase } from "../EntityBase.js";
import { Entity, ManyToOne, Property, types } from "@mikro-orm/mysql";
import { DiscordServer } from "./DiscordServer.entity.js";

@Entity()
export class MessageAliased extends EntityBase {
  @ManyToOne({ entity: () => DiscordServer, nullable: false })
  server!: DiscordServer;

  @Property({ type: "varchar", length: 20 })
  alias = "";

  @Property({ type: types.text })
  message = "";
}
