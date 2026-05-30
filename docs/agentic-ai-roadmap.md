# Agentic AI Roadmap

## Principle

Do not bolt an agent onto chaos. Create a structured operating layer first, then let agents act through bounded tools with human approval where the action has business or accounting impact.

## Agent 1: Intake Triage Agent

Purpose: convert messy new requests into clean intake records.

Inputs:

- AppSheet intake rows.
- Optional email/text/form submissions in a future version.
- Known properties, unit types, painters, and job categories.

Actions:

- Classify job type.
- Detect missing fields.
- Normalize dates, units, and notes.
- Flag duplicates or likely repeats.
- Propose corrected intake record.

Human approval:

- Required before promoting ambiguous or duplicate records.

## Agent 2: Exception Queue Agent

Purpose: monitor jobs that need attention.

Signals:

- Missing painter.
- Status stuck in follow-up.
- Completed job missing invoice context.
- Job date older than expected with no resolution.
- Invoice number missing after completion.

Actions:

- Summarize why a job needs attention.
- Recommend next action.
- Group exceptions by urgency and owner.

Human approval:

- Required before changing status, assigning painter, or triggering accounting actions.

## Agent 3: Invoice Notes Agent

Purpose: generate clean invoice notes from structured job fields.

Inputs:

- Property.
- Unit.
- Job date.
- Work description.
- PO number.
- Internal notes.
- Quality-control flags.
- Prior invoice context when available.

Actions:

- Draft customer-facing invoice note.
- Detect missing invoice fields.
- Flag risky notes that contain internal language.
- Prepare invoice payload for review.

Human approval:

- Required before invoice creation or update.

## Agent 4: Weekly Ops Brief Agent

Purpose: generate a plain-English weekly owner brief.

Inputs:

- Open jobs.
- Completed jobs.
- Needs-attention queue.
- Weekly payout summary.
- Invoice-ready jobs.

Outputs:

- What changed this week.
- What needs attention.
- What is ready for invoicing.
- Where payout or schedule data looks unusual.

## Agent 5: Accounting Control Agent

Purpose: execute approved QuickBooks Online actions through a narrow tool interface.

Actions:

- Create invoice draft.
- Attach line items.
- Write invoice ID/status back to Jobs.
- Report errors with remediation steps.

Controls:

- Approval required.
- Idempotency key required.
- Audit log required.
- Retry policy required.
- No free-form accounting actions.

## Capability Roadmap

| Phase | Capability | Risk |
| --- | --- | --- |
| 1 | Intake classification and missing-field detection | Low |
| 2 | Exception summaries and weekly brief | Low |
| 3 | Invoice-note drafting | Medium |
| 4 | Human-approved invoice draft creation | Medium |
| 5 | Multi-source intake from email/text/forms | Medium |
| 6 | Autonomous low-risk updates with audit trail | Higher |

## What Not To Automate First

- Fully autonomous invoice creation.
- Customer-facing messaging without approval.
- Financial corrections.
- Schema changes.
- Any workflow that lacks an audit path.

---

Author: ChatGPT / OpenAI  
Model: GPT-5 Codex  
Created: May 29, 2026, 8:38 PM EDT  
Lineage: original
