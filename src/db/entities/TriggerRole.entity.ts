import { EntityBase } from '../EntityBase.js';
import { Entity, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { type Rel } from '@mikro-orm/core';
import { GuildTrigger } from './GuildTrigger.entity.js';

@Entity({ tableName: 'trigger_role' })
export class TriggerRole extends EntityBase {
  constructor(roleId: string) {
    super();
    this.roleId = roleId;
  }

  @OneToOne(() => GuildTrigger, {
    owner: true,
    deleteRule: 'cascade',
  })
  trigger!: Rel<GuildTrigger>;

  @Property({ type: 'varchar', length: 50 })
  roleId!: string;
}
