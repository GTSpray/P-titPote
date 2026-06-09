import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { pollSummary } from '../../../../src/commands/cta/poll/pollSummary.js';
import {
  CTAData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { Poll } from '../../../../src/db/entities/Poll.entity.js';
import { PollStep } from '../../../../src/db/entities/PollStep.entity.js';
import { PollChoice } from '../../../../src/db/entities/PollChoice.entity.js';
import { PollResp } from '../../../../src/db/entities/PollResp.entity.js';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';
import { formatDiscordTimestamp } from '../../../../src/utils/pollDates.js';

describe('cta/pollSummary', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let aPoll: Poll;
  let firstStep: PollStep;
  let secondStep: PollStep;
  let firstChoice: PollChoice;
  let secondChoice: PollChoice;
  let data: CTAData;

  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();

    aPoll = new Poll(`aTitre`);
    aPoll.endDate = new Date(Date.now() + 1000);
    guild_id = randomDiscordId19();

    data = {
      components: [],
      custom_id: `{"t":"cta","d":{"a":"pollSummary", "pId": "${aPoll.id}"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({
      data,
      guild_id,
      permissions: admin_permissions,
    });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };

    const aGuild = new DiscordGuild(guild_id);
    aGuild.polls.add(aPoll);
    firstStep = new PollStep(`Un choix?`, 0);
    firstChoice = new PollChoice('Premier choix', 0);
    secondChoice = new PollChoice('Deuxième choix', 1);
    firstStep.choices.add([firstChoice, secondChoice]);
    secondStep = new PollStep(`Une réponse libre?`, 1);
    aPoll.steps.add(firstStep, secondStep);
    await em.persist(aGuild).flush();
  });

  it('should display a temporary message indicating that the command cannot be executed if the user is not a moderator', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data,
      guild_id,
      permissions: default_member_permissions,
    });

    const response = await pollSummary.handler({
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

  it('should set the poll endDate to now when publishing the summary', async () => {
    const beforeSummary = new Date(Date.now() - 500);
    await pollSummary.handler(handlerOpts);
    const afterSummary = new Date(Date.now() + 500);

    em.clear();
    const poll = await em.findOneOrFail(Poll, {
      id: aPoll.id,
    });

    expect(poll.endDate).toBeDateBetween(
      beforeSummary,
      afterSummary
    );
  });

  it.todo('should not update the end date of a poll that has already been published')

  it('should publish a vote summary with choice counts and free responses', async () => {
    const firstMemberId = randomDiscordId19();
    const secondMemberId = randomDiscordId19();
    const thirdMemberId = randomDiscordId19();
    const firstResp = new PollResp(firstMemberId, firstStep);
    firstResp.pollChoice = firstChoice;
    const secondResp = new PollResp(secondMemberId, firstStep);
    secondResp.pollChoice = firstChoice;
    const thirdResp = new PollResp(thirdMemberId, firstStep);
    thirdResp.pollChoice = secondChoice;
    const freeResp = new PollResp(firstMemberId, secondStep);
    freeResp.content = 'Une réponse complète';
    await em.persist([firstResp, secondResp, thirdResp, freeResp]).flush();

    const response = await pollSummary.handler(handlerOpts);
    em.clear();
    const poll = await em.findOneOrFail(Poll, {
      id: aPoll.id,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: [
              t('poll.report.title'),
              `## ${aPoll.title}`,
              t('poll.report.participants', { count: 3 }),
              t('poll.report.endDate', {
                date: formatDiscordTimestamp(<Date>poll.endDate),
              }),
              '',
              `### 1. ${firstStep.question}`,
              'Réponses : 3',
              '- Premier choix : 2 vote(s) (67%)',
              '- Deuxième choix : 1 vote(s) (33%)',
              '',
              `### 2. ${secondStep.question}`,
              'Réponses : 1',
              `- <@${firstMemberId}> : ${freeResp.content}`,
              '',
            ].join('\n'),
          },
        ],
      },
    });
  });
});
