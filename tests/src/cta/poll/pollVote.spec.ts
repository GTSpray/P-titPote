import {
  SqlEntityManager,
  AbstractSqlDriver,
  AbstractSqlConnection,
  AbstractSqlPlatform,
} from '@mikro-orm/mariadb';
import { pollVote } from '../../../../src/commands/cta/poll/pollVote.js';
import {
  ModalHandlerOptions,
  CTAData,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionModalHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import { DiscordGuild } from '../../../../src/db/entities/DiscordGuild.entity.js';
import { randomDiscordId19 } from '../../../mocks/discord-api/utils.js';
import {
  InteractionResponseType,
  ComponentType,
  MessageFlags,
} from 'discord-api-types/v10';
import { Poll } from '../../../../src/db/entities/Poll.entity.js';
import { PollStep } from '../../../../src/db/entities/PollStep.entity.js';
import { PollChoice } from '../../../../src/db/entities/PollChoice.entity.js';
import {
  getModalLabelComponnents,
  PartialComponentList,
  PartialComponentSingle,
} from '../../../helpers/getModalLabelComponnents.js';
import { PollResp } from '../../../../src/db/entities/PollResp.entity.js';
import { expectedPollResp } from '../../../epectedEntities/expectedPollResp.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/pollVote', () => {
  let guild_id: string;
  let em: SqlEntityManager<
    AbstractSqlDriver<AbstractSqlConnection, AbstractSqlPlatform>
  >;
  let handlerOpts: ModalHandlerOptions<any>;
  let aPoll: Poll;
  let firstStep: PollStep;
  let secondStep: PollStep;
  let data: CTAData;
  let aSecondStepCmp: PartialComponentSingle;
  let aFirstStepCmp: PartialComponentList;
  beforeEach(async () => {
    const { orm } = await initORM();
    em = orm.em.fork();

    aPoll = new Poll(`aTitre`);
    guild_id = randomDiscordId19();
    const aGuild = new DiscordGuild(guild_id);
    aGuild.polls.add(aPoll);
    firstStep = new PollStep(`A first question?`, 0);
    firstStep.choices.add([
      new PollChoice('A first choice?', 0),
      new PollChoice('A second choice?', 1),
      new PollChoice('A third choice?', 2),
      new PollChoice('A fourth choice?', 3),
    ]);
    secondStep = new PollStep(`A second question?`, 1);
    aPoll.steps.add(firstStep, secondStep);

    aFirstStepCmp = {
      custom_id: firstStep.id,
      type: ComponentType.StringSelect,
      values: [firstStep.choices[1].id],
    };

    aSecondStepCmp = {
      custom_id: secondStep.id,
      type: ComponentType.TextInput,
      value: 'A response',
    };

    data = {
      components: getModalLabelComponnents([aFirstStepCmp, aSecondStepCmp]),
      custom_id: `{"t":"cta","d":{"a":"pollVote", "pId": "${aPoll.id}"}}`,
    };
    const { req, res } = getInteractionModalHttpMock({ data, guild_id });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };
    await em.persist(aGuild).flush();
  });

  it('should create a PollResp for each PollStep in the poll', async () => {
    const memberId = <string>handlerOpts.req.body.member?.user.id;
    await pollVote.handler(handlerOpts);

    const pollResps = await em.findAll(PollResp, {
      where: { memberId },
      orderBy: {
        pollStep: {
          order: 'asc',
        },
      },
    });

    expect(pollResps).toEqual([
      expectedPollResp({
        memberId,
        pollChoice: firstStep.choices[1],
      }),
      expectedPollResp({
        memberId,
        pollChoice: null,
        content: <string>aSecondStepCmp.value,
      }),
    ]);
  });

  it('should not create a PollResp for a poll from another guild', async () => {
    const { req, res } = getInteractionModalHttpMock({
      data,
      guild_id: randomDiscordId19(),
    });
    const memberId = <string>req.body.member?.user.id;

    const response = await pollVote.handler({
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

    const pollResps = await em.findAll(PollResp, {
      where: { memberId },
    });
    expect(pollResps).toHaveLength(0);
  });

  it('should not create a PollResp when the member lost the required role after opening the modal', async () => {
    aPoll.role = randomDiscordId19();
    await em.persist(aPoll).flush();
    const memberId = <string>handlerOpts.req.body.member?.user.id;

    const response = await pollVote.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });

    const pollResps = await em.findAll(PollResp, {
      where: { memberId },
    });
    expect(pollResps).toHaveLength(0);
  });

  it('should not create a PollResp when the poll closed after opening the modal', async () => {
    aPoll.endDate = new Date('2026-05-31T13:00:00.000Z');
    await em.persist(aPoll).flush();
    const memberId = <string>handlerOpts.req.body.member?.user.id;

    const response = await pollVote.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('errors.voteClosed'),
      },
    });

    const pollResps = await em.findAll(PollResp, {
      where: { memberId },
    });
    expect(pollResps).toHaveLength(0);
  });

  it('should update each Resp, if they exist', async () => {
    const memberId = <string>handlerOpts.req.body.member?.user.id;

    const firstResp = new PollResp(memberId, firstStep);
    firstResp.pollChoice = firstStep.choices[0];
    const secondResp = new PollResp(memberId, secondStep);
    secondResp.content = 'Arthur!! Interprète !! Couillère';
    await em.persist([firstResp, secondResp]).flush();

    await pollVote.handler(handlerOpts);

    const pollResps = await em.findAll(PollResp, {
      where: { memberId },
      orderBy: {
        pollStep: {
          order: 'asc',
        },
      },
    });

    expect(pollResps).toEqual([
      expectedPollResp({
        memberId,
        pollChoice: firstStep.choices[1],
      }),
      expectedPollResp({
        memberId,
        pollChoice: null,
        content: <string>aSecondStepCmp.value,
      }),
    ]);
  });

  it("should display a temporary message indicating that the user's vote has been recorded", async () => {
    const response = await pollVote.handler(handlerOpts);
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('poll.vote.success'),
      },
    });
  });
});
