/**
 * Domain-layer errors. Throw these from aggregates and value objects when
 * invariants are violated. The application layer maps them to HTTP status
 * codes; nothing in this file is allowed to import from outer layers.
 */

export class DomainError extends Error {
  public readonly code: string;
  public readonly details: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export class InvariantViolation extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('invariant_violation', message, details);
    this.name = 'InvariantViolation';
  }
}

export class CrossUserReference extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('cross_user_reference', message, details);
    this.name = 'CrossUserReference';
  }
}

export class IllegalTransition extends DomainError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('illegal_transition', message, details);
    this.name = 'IllegalTransition';
  }
}
