import { EntityBase } from "../EntityBase.js";
import { Entity, ManyToOne, Property, types } from "@mikro-orm/mariadb";
import { DiscordGuild } from "./DiscordGuild.entity.js";
import { Rel, Unique } from "@mikro-orm/core";

@Entity()
@Unique({
  properties: ["server", "alias", "deletedAt"],
})
export class MessageAliased extends EntityBase {
  constructor(alias: string, message: string) {
    super();
    this.alias = alias;
    this.message = message;
  }

  @ManyToOne()
  server!: Rel<DiscordGuild>;

  @Property({ type: "varchar", length: 50 })
  alias!: string;

  @Property({ type: types.text })
  message!: string;
}
