import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import {
  POLL_STEP_LIMIT,
  pollAddQ,
} from '../../../../src/commands/cta/poll/pollAddQ.js';
import { ModalHandlerOptions } from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  TextInputStyle,
} from 'discord-api-types/v10';
import { Poll } from '../../../../src/db/entities/Poll.entity.js';
import { PollStep } from '../../../../src/db/entities/PollStep.entity.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/pollAddQ', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let existingPoll: Poll;

  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();

    existingPoll = new Poll(`aTitre`);
    guild_id = randomDiscordId19();

    const data = {
      components: [],
      custom_id: `{"t":"cta","d":{"a":"pollAddQ", "pId": "${existingPoll.id}"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({ data, guild_id });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };

    const aGuild = new DiscordGuild(guild_id);
    aGuild.polls.add(existingPoll);
    const firstStep = new PollStep(`A first question?`, 0);
    existingPoll.steps.add(firstStep);
    await em.persist(aGuild).flush();
  });

  it('should respond a modal with a question componnent', async () => {
    const response = await pollAddQ.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'pollCreate', pId: existingPoll.id },
        }),
        title: t('poll.modal.addQuestion.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('poll.modal.label.question'),
            component: {
              type: ComponentType.TextInput,
              custom_id: `question`,
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 45,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('poll.modal.label.description'),
            component: {
              type: ComponentType.TextInput,
              custom_id: `description`,
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 100,
              required: false,
            },
          },
        ],
      },
    });
  });

  it('should not respond a modal for a poll from another guild', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data: handlerOpts.req.body.data,
      guild_id: randomDiscordId19(),
    });

    const response = await pollAddQ.handler({
      ...handlerOpts,
      req,
      res,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });
  });

  it(`should respond an ephemeral message when poll has ${POLL_STEP_LIMIT} setp`, async () => {
    const stepSize = POLL_STEP_LIMIT;
    existingPoll.steps.add(
      Array.from({ length: stepSize }).map(
        (e, i) => new PollStep(`question n°${i}`, i),
      ),
    );

    await em.persist(existingPoll).flush();

    const response = await pollAddQ.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('errors.tooMany'),
      },
    });
  });

  it('should display a temporary message indicating that the user is not authorized to update the poll if it is published', async () => {
    existingPoll.publicationDate = new Date();
    await em.persist(existingPoll).flush();
    const response = await pollAddQ.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.doNotUpdatePublishedPoll'),
      },
    });
  });
});
