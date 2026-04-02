import { EntityBase } from "../EntityBase.js";
import { types } from "@mikro-orm/mariadb";
import { Entity, ManyToOne, Property, Unique } from "@mikro-orm/decorators/legacy";
import { DiscordGuild } from "./DiscordGuild.entity.js";
import { type Rel } from "@mikro-orm/core";

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

  @ManyToOne(() => DiscordGuild)
  server!: Rel<DiscordGuild>;

  @Property({ type: "varchar", length: 50 })
  alias!: string;

  @Property({ type: types.text })
  message!: string;
}
