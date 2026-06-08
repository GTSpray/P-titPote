import { EntityBase } from '../EntityBase.js';
import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { type Rel } from '@mikro-orm/core';
import { PollStep } from './PollStep.entity.js';
import { PollChoice } from './PollChoice.entity.js';

@Entity()
@Unique({
  properties: ['memberId', 'pollStep', 'deletedAt'],
})
export class PollResp extends EntityBase {
  constructor(memberId: string, step: PollStep) {
    super();
    this.memberId = memberId;
    this.pollStep = step;
  }

  @Property({ type: 'varchar', length: 25 })
  memberId: string;

  @ManyToOne(() => PollStep)
  pollStep!: Rel<PollStep>;

  @ManyToOne(() => PollChoice, { nullable: true })
  pollChoice?: Rel<PollChoice> | null;

  @Property({ type: 'varchar', length: 400, nullable: true })
  content?: string | null;
}
