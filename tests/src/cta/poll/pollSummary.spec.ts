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
    aPoll.endDate = undefined;
    await em.persist(aPoll).flush();
    em.clear();

    await pollSummary.handler(handlerOpts);
    const today = new Date(Date.now());

    em.clear();
    const poll = await em.findOneOrFail(Poll, {
      id: aPoll.id,
    });
    expect(poll.endDate).toBeDateCloseTo(today, 1000);
  });

  it('should not update the end date of a poll that has already been published', async () => {
    const publishedEndDate = new Date('2026-06-01T12:00:00.000Z');
    aPoll.endDate = publishedEndDate;
    await em.persist(aPoll).flush();

    await pollSummary.handler(handlerOpts);

    em.clear();
    const poll = await em.findOneOrFail(Poll, {
      id: aPoll.id,
    });

    expect(poll.endDate).toEqual(publishedEndDate);
  });

  it('should publish a vote summary with choice counts and free responses', async () => {
    const members = Array.from({ length: 3 }).map(() => randomDiscordId19());

    const today = Date.now() - 10000; // set a voting date to ensure the test is reproducible
    const resps: PollResp[] = members.reduce(
      (acc, curr, i) => {
        const voteDate = new Date(today + i * 1000);
        const memberId = <string>curr;
        const firstResp = new PollResp(memberId, firstStep);
        firstResp.pollChoice = i % 2 === 0 ? firstChoice : secondChoice;
        firstResp.createdAt = voteDate;

        const freeResp = new PollResp(memberId, secondStep);
        freeResp.content = `moi ! ${memberId} je propose une réponse complète... blah blah blah...`;
        freeResp.createdAt = voteDate;

        return [...acc, firstResp, freeResp];
      },
      <PollResp[]>[],
    );

    await em.persist(resps).flush();

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
              t('poll.report.participants', { count: members.length }),
              t('poll.report.endDate', {
                date: formatDiscordTimestamp(<Date>poll.endDate),
              }),
              '',
              `### 1. ${firstStep.question}`,
              t('poll.report.participants', {
                count: members.length,
              }),
              `- ${t('poll.report.votePercent', {
                label: firstChoice.label,
                count: 2,
                percent: 67,
              })}`,
              `- ${t('poll.report.votePercent', {
                label: secondChoice.label,
                count: 1,
                percent: 33,
              })}`,
              '',
              `### 2. ${secondStep.question}`,
              t('poll.report.participants', {
                count: members.length,
              }),
              ...members.map(
                (memberId, i) =>
                  `__${t('poll.report.answerNb', { nb: i + 1 })}:__\n> moi ! ${memberId} je propose une réponse complète... blah blah blah...\n`,
              ),
              '',
            ].join('\n'),
          },
        ],
      },
    });
  });

  it('should prevent voters from mention anything in their free responses', async () => {
    const memberId = randomDiscordId19();
    const firstResp = new PollResp(memberId, firstStep);
    firstResp.pollChoice = firstChoice;
    const freeResp = new PollResp(memberId, secondStep);
    freeResp.content = `moi ! <@${memberId}> je ping @everyone pour embeter tout le monde`;

    await em.persist([firstResp, freeResp]).flush();

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
              t('poll.report.participants', { count: 1 }),
              t('poll.report.endDate', {
                date: formatDiscordTimestamp(<Date>poll.endDate),
              }),
              '',
              `### 1. ${firstStep.question}`,
              t('poll.report.participants', { count: 1 }),
              '- Premier choix : 1 vote(s) (100%)',
              '- Deuxième choix : 0 vote(s) (0%)',
              '',
              `### 2. ${secondStep.question}`,
              t('poll.report.participants', { count: 1 }),
              `__${t('poll.report.answerNb', { nb: 1 })}:__\n> moi ! <@\u200B${memberId}> je ping @\u200Beveryone pour embeter tout le monde`,
              '',
              '',
            ].join('\n'),
          },
        ],
      },
    });
  });
});
