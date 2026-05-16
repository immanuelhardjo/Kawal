export class ApplicationError extends Error {
  public readonly code: string;
  public readonly details: Readonly<Record<string, unknown>>;
  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export class Unauthenticated extends ApplicationError {
  constructor(message = 'Unauthenticated') {
    super('unauthenticated', message);
    this.name = 'Unauthenticated';
  }
}

export class NotFound extends ApplicationError {
  constructor(resource: string, id: string) {
    super('not_found', `${resource} ${id} not found`, { resource, id });
    this.name = 'NotFound';
  }
}

export class Forbidden extends ApplicationError {
  constructor(message = 'Forbidden') {
    super('forbidden', message);
    this.name = 'Forbidden';
  }
}

export class IngestTimeout extends ApplicationError {
  constructor(details: Record<string, unknown>) {
    super('ingest_timeout', 'Ingest request exceeded the configured ceiling', details);
    this.name = 'IngestTimeout';
  }
}

export class IngestFailed extends ApplicationError {
  constructor(reason: string, details: Record<string, unknown> = {}) {
    super('ingest_failed', reason, details);
    this.name = 'IngestFailed';
  }
}
