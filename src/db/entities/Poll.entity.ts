import { EntityBase } from "../EntityBase.js";
import { Entity, ManyToOne, Property, types } from "@mikro-orm/mariadb";
import { DiscordGuild } from "./DiscordGuild.entity.js";
import { Rel } from "@mikro-orm/core";

@Entity()
export class Poll extends EntityBase {
  constructor(question: string) {
    super();
    this.question = question;
  }

  @ManyToOne()
  server!: Rel<DiscordGuild>;

  @Property({ type: "varchar", length: 200 })
  question!: string;

  @Property({ type: "varchar", length: 50 })
  role!: string;
}
