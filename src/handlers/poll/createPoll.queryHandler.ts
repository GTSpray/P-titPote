import type { EntityManager } from '@mikro-orm/core';
import { findOrCreateGuild } from '../../db/services/discordGuild.service.js';
import type { Persister } from '../../repositories/repository.js';
import type { PollEntity } from '../../entities/poll.entity.js';
import { CreatePollQuery } from '../../queries/poll/createPoll.query.js';
import { PollDraftComputer } from './pollDraft.computer.js';

export class CreatePollQueryHandler {
  constructor(
    private em: EntityManager,
    private pollRepository: Persister<PollEntity>,
    private computer: PollDraftComputer,
  ) {}

  async handle(query: CreatePollQuery): Promise<PollEntity> {
    const guild = await findOrCreateGuild(this.em, query.guildId);
    const poll = this.computer.create(query, { serverId: guild.id });
    await this.pollRepository.persist(poll);
    await this.em.flush();
    return poll;
  }
}
