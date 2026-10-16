import { EntityBase } from '../EntityBase.js';
import { types } from '@mikro-orm/mariadb';
import {
  Entity,
  ManyToOne,
  OneToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { DiscordGuild } from './DiscordGuild.entity.js';
import { type Rel } from '@mikro-orm/core';
import { TriggerMessage } from './TriggerMessage.entity.js';
import { TriggerRole } from './TriggerRole.entity.js';

export type GuildTriggerKind = 'welcome_message' | 'welcome_role';

/** Max non-deleted triggers per guild (disabled included). */
export const TRIGGER_LIMIT = 10;

@Entity()
@Unique({
  properties: ['server', 'name', 'deletedAt'],
})
export class GuildTrigger extends EntityBase {
  constructor(name: string, kind: GuildTriggerKind) {
    super();
    this.name = name;
    this.kind = kind;
  }

  @ManyToOne(() => DiscordGuild)
  server!: Rel<DiscordGuild>;

  @Property({ type: 'varchar', length: 50 })
  name!: string;

  @Property({ type: 'varchar', length: 32 })
  kind!: GuildTriggerKind;

  @Property({ type: types.boolean })
  enabled: boolean = true;

  @OneToOne(() => TriggerMessage, (cfg) => cfg.trigger, {
    orphanRemoval: true,
    nullable: true,
  })
  messageConfig?: Rel<TriggerMessage> | null;

  @OneToOne(() => TriggerRole, (cfg) => cfg.trigger, {
    orphanRemoval: true,
    nullable: true,
  })
  roleConfig?: Rel<TriggerRole> | null;
}
