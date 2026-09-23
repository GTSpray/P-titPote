import { describe, expect, it } from 'vitest';
import { newTimestamps } from '../../../../src/entities/common.js';
import type { Poll } from '../../../../src/entities/poll.js';
import { PollVoteComputer } from '../../../../src/domain/poll/pollVoteComputer.js';

const timestamps = newTimestamps();

const poll: Poll = {
  id: 'poll-1',
  guildId: 'guild-1',
  title: 'Lunch',
  role: null,
  endDate: null,
  publicationDate: new Date(),
  steps: [
    {
      id: 'step-1',
      pollId: 'poll-1',
      question: 'Where?',
      description: null,
      order: 0,
      pollPublicationDate: new Date(),
      choices: [
        {
          id: 'choice-1',
          pollStepId: 'step-1',
          label: 'Here',
          order: 0,
          ...timestamps,
        },
      ],
      ...timestamps,
    },
    {
      id: 'step-2',
      pollId: 'poll-1',
      question: 'Notes',
      description: null,
      order: 1,
      pollPublicationDate: new Date(),
      choices: [],
      ...timestamps,
    },
  ],
  ...timestamps,
};

describe('PollVoteComputer', () => {
  it('keeps one response per step and updates the previous answer', async () => {
    const computer = new PollVoteComputer();
    const existing = {
      id: 'resp-1',
      memberId: 'member-1',
      pollStepId: 'step-2',
      pollChoiceId: null,
      content: 'old',
      ...timestamps,
    };

    const result = await computer.compute(
      { responses: [existing] },
      {
        poll,
        memberId: 'member-1',
        answers: [
          { stepId: 'step-1', choiceId: 'choice-1', content: null },
          { stepId: 'step-2', choiceId: null, content: 'new' },
        ],
      },
    );

    expect(result.responses).toEqual([
      expect.objectContaining({
        pollStepId: 'step-1',
        pollChoiceId: 'choice-1',
        memberId: 'member-1',
      }),
      expect.objectContaining({
        id: 'resp-1',
        pollStepId: 'step-2',
        content: 'new',
      }),
    ]);
  });
});
