/** Pure domain types for polls - no ORM types. */

export interface PollChoiceEntity {
  id: string;
  label: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export interface PollStepEntity {
  id: string;
  question: string;
  description: string | null;
  order: number;
  choices: PollChoiceEntity[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export interface PollRespEntity {
  id: string;
  memberId: string;
  pollStepId: string;
  pollChoiceId: string | null;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export interface PollEntity {
  id: string;
  title: string;
  role: string | null;
  /** Internal DiscordGuild.id (not the Discord guild id). */
  serverId: string;
  publicationDate: Date | null;
  endDate: Date | null;
  steps: PollStepEntity[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
