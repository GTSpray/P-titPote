import { EntityBase } from "../EntityBase.js";
import { types } from "@mikro-orm/mariadb";
import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { type Rel } from "@mikro-orm/core";
import { PollStep } from "./PollStep.entity.js";

@Entity()
@Unique({
  properties: ["pollstep", "order"],
})
export class PollChoice extends EntityBase {
  constructor(label: string, order: number) {
    super();
    this.label = label;
    this.order = order;
  }

  @ManyToOne(() => PollStep)
  pollstep!: Rel<PollStep>;

  @Property({ type: "varchar", length: 200 })
  label!: string;

  @Property({ type: types.smallint })
  order!: number;
}
