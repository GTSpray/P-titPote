import { EntityBase } from "../EntityBase.js";
import {
  Entity,
  ManyToOne,
  Property,
  Collection,
  OneToMany,
  Rel,
} from "@mikro-orm/mariadb";
import { DiscordGuild } from "./DiscordGuild.entity.js";
import { PollStep } from "./PollStep.entity.js";

@Entity()
export class Poll extends EntityBase {
  constructor(title: string, role?: string) {
    super();
    this.title = title;
    this.role = role || null;
  }

  @ManyToOne()
  server!: Rel<DiscordGuild>;

  @Property({ type: "varchar", length: 45 })
  title!: string;

  @Property({ type: "varchar", length: 50, nullable: true })
  role?: string | null;

  @OneToMany({
    entity: () => PollStep,
    mappedBy: (ps: PollStep) => ps.poll,
    orderBy: [{ order: "asc" }],
  })
  steps: Collection<PollStep> = new Collection<PollStep>(this);
}
