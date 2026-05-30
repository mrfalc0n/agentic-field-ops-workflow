# Product Brief

## One-Line Summary

A field-operations workflow that converts unstructured job requests into structured work records, exception queues, weekly summaries, payout review, and invoice-ready context.

## Product Thesis

Small businesses often do not need a giant platform migration first. They need a reliable operating layer that captures work cleanly, preserves human judgment, and gives automation something structured to act on.

This project uses familiar tools to create that layer before introducing AI agents. That is the correct sequencing: structure first, agent second. Otherwise the "agent" becomes a very confident intern wandering through a supply closet.

## Users

- Owner/operator: wants fewer manual reminders, clearer weekly visibility, and faster invoice prep.
- Field or admin user: needs a simple way to create and update jobs without editing fragile spreadsheet logic.
- Bookkeeping/accounting reviewer: needs invoice-ready context with a clear approval path.
- Future AI assistant: needs structured data, constraints, and tool boundaries.

## Core Jobs To Be Done

- Capture a new job request quickly from a mobile-friendly interface.
- Promote valid intake records into the operational job table.
- Update safe fields like painter, status, and notes without exposing backend columns.
- Surface jobs that need attention.
- Review weekly operational and payout summaries.
- Prepare invoice context for QuickBooks Online with human review.

## Constraints

- Keep Google Sheets as the near-term source of truth.
- Do not break existing spreadsheet formulas or helper tabs.
- Avoid forcing the business into a heavyweight platform migration.
- Keep the operator UI simple.
- Keep accounting actions approval-based.
- Avoid exposing credentials, private IDs, customer records, or vendor-specific implementation details.

## MVP Decisions

- AppSheet is the operator interface, not the entire backend.
- Google Sheets remains the structured operating layer.
- Apps Script performs validation, promotion, refresh, protection, backup, and integration glue.
- QuickBooks Online actions are modeled as controlled accounting workflows.
- AI agents are introduced after the data model is reliable enough to support them.

## Success Metrics

- Fewer jobs created outside the structured intake path.
- Fewer active jobs missing painter, status, or invoice context.
- Faster weekly review.
- Less manual invoice preparation.
- Clearer exception queue for the owner/operator.
- Reduced risk of accidental edits to formulas or backend fields.

## Strategic Read

The value is not the stack. The value is the operating model.

The stack is intentionally boring: AppSheet, Sheets, Apps Script, QuickBooks Online. That is a feature. It means the system can be adopted by a real business without a science project budget, while still creating the structure needed for future agentic workflows.

---

Author: ChatGPT / OpenAI  
Model: GPT-5 Codex  
Created: May 29, 2026, 8:38 PM EDT  
Lineage: original
