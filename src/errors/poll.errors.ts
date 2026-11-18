export class PollNotFoundError extends Error {
  constructor(public readonly pollId: string) {
    super(`Poll not found: ${pollId}`);
    this.name = 'PollNotFoundError';
  }
}

export class PollStepNotFoundError extends Error {
  constructor(public readonly stepId: string) {
    super(`Poll step not found: ${stepId}`);
    this.name = 'PollStepNotFoundError';
  }
}

export class PollAlreadyPublishedError extends Error {
  constructor() {
    super('Poll is already published');
    this.name = 'PollAlreadyPublishedError';
  }
}

export class PollClosedError extends Error {
  constructor() {
    super('Poll voting is closed');
    this.name = 'PollClosedError';
  }
}

export class PollStepLimitReachedError extends Error {
  constructor() {
    super('Poll step limit reached');
    this.name = 'PollStepLimitReachedError';
  }
}

export class PollChoiceLimitReachedError extends Error {
  constructor() {
    super('Poll choice limit reached');
    this.name = 'PollChoiceLimitReachedError';
  }
}

export class MissingVoterRoleError extends Error {
  constructor() {
    super('Member is missing the required voter role');
    this.name = 'MissingVoterRoleError';
  }
}

export class PollReportPublishError extends Error {
  constructor() {
    super('Failed to publish poll report');
    this.name = 'PollReportPublishError';
  }
}
