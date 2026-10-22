import { EntityBase } from '../EntityBase.js';
import { types } from '@mikro-orm/mariadb';
import { Entity, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { type Rel } from '@mikro-orm/core';
import { GuildTrigger } from './GuildTrigger.entity.js';

@Entity({ tableName: 'trigger_message' })
export class TriggerMessage extends EntityBase {
  constructor(channelId: string, message: string) {
    super();
    this.channelId = channelId;
    this.message = message;
  }

  @OneToOne(() => GuildTrigger, {
    owner: true,
    deleteRule: 'cascade',
  })
  trigger!: Rel<GuildTrigger>;

  @Property({ type: 'varchar', length: 50 })
  channelId!: string;

  @Property({ type: types.text })
  message!: string;
}
