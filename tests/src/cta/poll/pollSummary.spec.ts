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
  InteractionResponseType,
  MessageFlags,
  Routes,
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
import { REST } from 'discord.js';
import {
  DiscrodRESTMock,
  DiscrodRESTMockVerb,
} from '../../../mocks/discordjs.js';

describe('cta/pollSummary', () => {
  let guild_id: string;
  let channel_id: string;
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
  const postSpy = vi.spyOn(REST.prototype, 'post');

  beforeEach(async () => {
    postSpy.mockClear();
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
    channel_id = req.body.channel_id || 'failed mock response';
    DiscrodRESTMock.register(
      {
        verb: DiscrodRESTMockVerb.post,
        fullRoute: Routes.channelMessages(channel_id),
      },
      {},
    );

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

  it('should keep the poll open when publishing the summary fails', async () => {
    aPoll.endDate = undefined;
    await em.persist(aPoll).flush();
    em.clear();
    postSpy.mockRejectedValueOnce(new Error('discord api error'));

    const response = await pollSummary.handler(handlerOpts);

    em.clear();
    const poll = await em.findOneOrFail(Poll, {
      id: aPoll.id,
    });
    expect(poll.endDate).toBeFalsy();
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('poll.report.failed'),
      },
    });
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
        flags: MessageFlags.Ephemeral,
        content: t('poll.report.sent', { count: 1 }),
      },
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
      body: {
        content: [
          `# ${t('poll.report.title')}`,
          `## ${poll.title}`,
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
        allowed_mentions: { parse: [] },
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
    em.clear();

    await pollSummary.handler(handlerOpts);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
      body: {
        content: expect.not.stringContaining(`<@${memberId}>`),
        allowed_mentions: { parse: [] },
      },
    });
    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
      body: {
        content: expect.not.stringContaining(`@everyone`),
        allowed_mentions: { parse: [] },
      },
    });

    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
      body: {
        content: expect.stringContaining(`<@\u200B${memberId}>`),
        allowed_mentions: { parse: [] },
      },
    });
    expect(postSpy).toHaveBeenCalledWith(Routes.channelMessages(channel_id), {
      body: {
        content: expect.stringContaining(`@\u200Beveryone`),
        allowed_mentions: { parse: [] },
      },
    });
  });

  it('should split the summary into multiple discord messages when it exceeds the character limit', async () => {
    const members = Array.from({ length: 8 }).map(() => randomDiscordId19());
    const base =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque lacinia dolor sodales tempor maximus. Donec tempor eros non risus pretium vestibulum.';

    const today = Date.now() - 10000;
    const resps: PollResp[] = members.flatMap((memberId, i) => {
      const voteDate = new Date(today + i * 1000);
      const firstResp = new PollResp(memberId, firstStep);
      firstResp.pollChoice = firstChoice;
      firstResp.createdAt = voteDate;

      const freeResp = new PollResp(memberId, secondStep);
      freeResp.content = `${base} ${memberId} ${base}`;
      freeResp.createdAt = voteDate;
      return [firstResp, freeResp];
    });
    await em.persist(resps).flush();
    const response = await pollSummary.handler(handlerOpts);
    const poll = await em.findOneOrFail(Poll, {
      id: aPoll.id,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('poll.report.sent', { count: 2 }),
      },
    });

    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(postSpy).toHaveBeenNthCalledWith(
      1,
      Routes.channelMessages(channel_id),
      {
        body: {
          content: [
            `# ${t('poll.report.title')}`,
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
              count: members.length,
              percent: 100,
            })}`,
            `- ${t('poll.report.votePercent', {
              label: secondChoice.label,
              count: 0,
              percent: 0,
            })}`,
            '',
            `### 2. ${secondStep.question}`,
            t('poll.report.participants', {
              count: members.length,
            }),
            ...members
              .slice(0, 5)
              .map(
                (memberId, i) =>
                  `__${t('poll.report.answerNb', { nb: i + 1 })}:__\n> ${base} ${memberId} ${base}\n`,
              ),
          ].join('\n'),
          allowed_mentions: { parse: [] },
        },
      },
    );
    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      Routes.channelMessages(channel_id),
      {
        body: {
          content: [
            ...members
              .slice(5, members.length)
              .map(
                (memberId, i) =>
                  `__${t('poll.report.answerNb', { nb: i + 6 })}:__\n> ${base} ${memberId} ${base}\n`,
              ),
            '',
          ].join('\n'),
          allowed_mentions: { parse: [] },
        },
      },
    );
  });
});
