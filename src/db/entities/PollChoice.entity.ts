import { EntityBase } from "../EntityBase.js";
import { Entity, ManyToOne, Property, types } from "@mikro-orm/mariadb";
import { Rel, Unique } from "@mikro-orm/core";
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

  @ManyToOne()
  pollstep!: Rel<PollStep>;

  @Property({ type: "varchar", length: 200 })
  label!: string;

  @Property({ type: types.smallint })
  order!: number;
}
