import { EntityBase } from '../EntityBase.js';
import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { type Rel } from '@mikro-orm/core';
import { DiscordGuild } from './DiscordGuild.entity.js';

@Entity()
@Unique({
  properties: ['threadId', 'deletedAt'],
})
export class ThreadRemind extends EntityBase {
  constructor(threadId: string, ownerUserId: string, idleDays: number) {
    super();
    this.threadId = threadId;
    this.ownerUserId = ownerUserId;
    this.idleDays = idleDays;
  }

  @ManyToOne(() => DiscordGuild)
  server!: Rel<DiscordGuild>;

  @Property({ type: 'varchar', length: 50 })
  threadId!: string;

  @Property({ type: 'varchar', length: 50 })
  ownerUserId!: string;

  @Property({ type: 'smallint' })
  idleDays!: number;
}
