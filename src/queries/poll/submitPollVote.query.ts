import * as z from 'zod';
import { parseCommand } from '../../errors/invalidCommand.js';

const SubmitPollVoteSchema = z.object({
  pollId: z.string().uuid(),
  memberId: z.string().min(1).max(25),
  memberRoles: z.array(z.string()),
});

export class SubmitPollVoteQuery {
  guildId: string;
  pollId: string;
  memberId: string;
  memberRoles: string[];
  /** Raw Discord modal submit `data` (components). */
  modalData: unknown;

  constructor(payload: {
    guildId: string;
    pollId?: string;
    memberId?: string;
    memberRoles?: string[];
    modalData: unknown;
  }) {
    const parsed = parseCommand(SubmitPollVoteSchema, {
      pollId: payload.pollId,
      memberId: payload.memberId,
      memberRoles: payload.memberRoles,
    });
    this.guildId = payload.guildId;
    this.pollId = parsed.pollId;
    this.memberId = parsed.memberId;
    this.memberRoles = parsed.memberRoles;
    this.modalData = payload.modalData;
  }
}
