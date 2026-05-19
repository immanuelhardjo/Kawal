# Capability: Conversation History

## Purpose

Models the ConversationMessage record — the persisted exchange between a user and the AI on a given case — and defines the API endpoint and UI behaviour for retrieving and displaying that history in the AI chat panel on the Kasus Detail screen.

## Requirements

### Requirement: Conversation message record, owned per user per case

The system SHALL model a ConversationMessage owned by exactly one user (`user_id`), scoped to a case owned by the same user (`case_id`), with a question text, an answer text in Bahasa Indonesia, arrays of cited claim IDs, cited event IDs, and cited source IDs (all referencing records owned by the same user), and a `created_at` timestamp. All reads and writes SHALL be scoped to the authenticated user's `user_id`.

#### Scenario: Message persisted after AI answer

- **WHEN** the user submits a question via `POST /ai/ask` for a case they own
- **THEN** a ConversationMessage row is written with the question text, the answer text, and the cited IDs returned by the AI port
- **AND** the response to the caller is unchanged (the same `ConversationAnswer` shape)

#### Scenario: Cross-user read rejected

- **WHEN** a user requests conversation history for a case they do not own
- **THEN** the system returns a not-found error equivalent to the case not existing

### Requirement: Retrieve conversation history for a case

The system SHALL expose a `GET /ai/conversation-history?caseId=<id>` endpoint that returns the authenticated user's ConversationMessage rows for the given case, ordered by `created_at ASC`, limited to the 50 most recent messages.

#### Scenario: Empty history

- **GIVEN** a user has not yet asked any questions on a case they own
- **WHEN** they request conversation history for that case
- **THEN** the response is an empty array with a 200 status

#### Scenario: History returned in chronological order

- **GIVEN** a user has asked three questions on a case at times T1, T2, T3 (T1 < T2 < T3)
- **WHEN** they request conversation history for that case
- **THEN** the response lists the three messages in order T1, T2, T3

#### Scenario: History truncated at 50 messages

- **GIVEN** a user has asked 60 questions on a case
- **WHEN** they request conversation history
- **THEN** the response contains the 50 most recent messages (messages 11–60 in creation order)

### Requirement: Conversation history displayed in AI chat panel

The system SHALL display the authenticated user's conversation history for the current case in the left AI chat panel on the Kasus Detail screen, loaded on mount, with each exchange showing the question and the AI answer. Cited source IDs in an answer SHALL be rendered as tappable chips; tapping a chip SHALL open that source's detail in the right tray Source tab.

#### Scenario: History loads on screen mount

- **WHEN** the user navigates to a Kasus Detail screen
- **THEN** the chat panel shows any existing conversation history for that case, oldest messages at the top

#### Scenario: New message appended optimistically

- **WHEN** the user submits a new question
- **THEN** the question appears immediately in the chat panel in a pending state
- **AND** when the answer arrives, the pending state is replaced with the full exchange

#### Scenario: Cited source chip navigates right tray

- **WHEN** an AI answer contains one or more cited source IDs
- **AND** the user taps a cited source chip in the answer
- **THEN** the right tray switches to the Source tab and opens the detail view for that source
