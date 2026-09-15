import { EntityBase } from '../EntityBase.js';
import {
  Entity,
  Index,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { type Rel } from '@mikro-orm/core';
import { DiscordGuild } from './DiscordGuild.entity.js';
import { types } from '@mikro-orm/mariadb';

@Entity()
@Unique({
  properties: ['threadId', 'deletedAt'],
})
@Index({ properties: ['nextTickAt'] })
export class ThreadRemind extends EntityBase {
  constructor(
    threadId: string,
    ownerUserId: string,
    idleDays: number,
    nextTickAt: Date = new Date(),
  ) {
    super();
    this.threadId = threadId;
    this.ownerUserId = ownerUserId;
    this.idleDays = idleDays;
    this.nextTickAt = nextTickAt;
  }

  @ManyToOne(() => DiscordGuild)
  server!: Rel<DiscordGuild>;

  @Property({ type: 'varchar', length: 50 })
  threadId!: string;

  @Property({ type: 'varchar', length: 50 })
  ownerUserId!: string;

  @Property({ type: 'smallint' })
  idleDays!: number;

  /** When this reminder becomes eligible for the hourly loop. */
  @Property({ type: types.datetime })
  nextTickAt!: Date;

  /** Discord message id of the last bot bump, if still tracked. */
  @Property({ type: 'varchar', length: 50, nullable: true })
  lastBumpMessageId?: string | null;
}
