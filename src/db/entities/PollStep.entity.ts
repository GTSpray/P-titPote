import { EntityBase } from "../EntityBase.js";
import { types } from "@mikro-orm/mariadb";
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from "@mikro-orm/decorators/legacy";
import { Collection, type Rel } from "@mikro-orm/core";
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

  @ManyToOne(() => Poll)
  poll!: Rel<Poll>;

  @Property({ type: types.smallint })
  order!: number;
}
