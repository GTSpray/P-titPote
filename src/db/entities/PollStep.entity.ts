import { EntityBase } from "../EntityBase.js";
import {
  Entity,
  ManyToOne,
  Property,
  Collection,
  OneToMany,
  Rel,
  types,
} from "@mikro-orm/mariadb";
import { PollChoice } from "./PollChoice.entity.js";
import { Poll } from "./Poll.entity.js";

@Entity()
export class PollStep extends EntityBase {
  constructor(question: string, order: number) {
    super();
    this.question = question;
    this.order = order;
  }

  @Property({ type: "varchar", length: 200 })
  question!: string;

  @OneToMany({
    entity: () => PollChoice,
    mappedBy: (pc: PollChoice) => pc.pollstep,
    orderBy: [{ order: "asc" }],
  })
  choices: Collection<PollChoice> = new Collection<PollChoice>(this);

  @ManyToOne()
  poll!: Rel<Poll>;

  @Property({ type: types.smallint })
  order!: number;
}
