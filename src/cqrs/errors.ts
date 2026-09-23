export class NotFoundError extends Error {
  readonly criteria?: unknown;

  constructor(message: string, criteria?: unknown) {
    super(message);
    this.name = 'NotFoundError';
    this.criteria = criteria;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends Error {
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'BadRequestError';
    this.details = details;
  }
}

export class TooManyError extends BadRequestError {
  constructor(message = 'Too many records') {
    super(message);
    this.name = 'TooManyError';
  }
}

export class PollAlreadyPublishedError extends BadRequestError {
  constructor(message = 'Poll is already published') {
    super(message);
    this.name = 'PollAlreadyPublishedError';
  }
}

export class VoteClosedError extends BadRequestError {
  constructor(message = 'Vote is closed') {
    super(message);
    this.name = 'VoteClosedError';
  }
}
