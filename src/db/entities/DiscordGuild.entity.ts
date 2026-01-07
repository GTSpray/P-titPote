import { EntityBase } from "../EntityBase.js";
import {
  Collection,
  Entity,
  OneToMany,
  Property,
  Unique,
} from "@mikro-orm/mariadb";
import { MessageAliased } from "./MessageAliased.entity.js";
import { Poll } from "./Poll.entity.js";

@Entity()
@Unique({
  properties: ["guildId", "deletedAt"],
})
export class DiscordGuild extends EntityBase {
  constructor(guildId: string) {
    super();
    this.guildId = guildId;
  }

  @Property({ type: "varchar", length: 50 })
  guildId: string;

  @OneToMany(() => MessageAliased, (msg) => msg.server)
  messageAliaseds: Collection<MessageAliased> = new Collection<MessageAliased>(
    this,
  );

  @OneToMany(() => Poll, (poll) => poll.server)
  polls: Collection<Poll> = new Collection<Poll>(this);
}
