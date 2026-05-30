# Current Vs Planned

## Why This Exists

The project is intentionally honest about the line between working automation and agentic roadmap. That distinction matters for product trust.

The current system pattern is not presented as a fully autonomous AI agent. It is a structured operating layer that makes useful agents possible.

## Working System Pattern

The deployed workflow pattern uses:

- AppSheet as the operator-facing interface.
- Google Sheets as the structured operating layer.
- Google Apps Script for intake promotion, summary refresh, protection, backup, and integration glue.
- QuickBooks Online integration patterns for invoice preparation and accounting-system writeback.
- Human review before accounting-impacting actions.

## Sanitized Public Repo Contents

This public repo includes:

- Documentation of the product decisions and architecture.
- Mock job data.
- Mermaid diagrams.
- Sanitized Apps Script-style samples.
- A practical agent roadmap.

It does not include the private production implementation, live data, credentials, client identifiers, spreadsheet IDs, Apps Script deployment IDs, or QuickBooks Online configuration.

## Planned Agentic Layer

The agentic layer is designed to run above the structured operating layer:

1. Read structured queues from the source-of-truth layer.
2. Classify or summarize operational state.
3. Detect missing fields, duplicate requests, stale jobs, or invoice risks.
4. Draft recommended actions.
5. Ask for human approval before high-trust changes.
6. Execute approved actions through narrow tools.
7. Write audit results back to the operating layer.

## Submission Framing

The correct way to describe this project:

> This is a real operational automation system with a sanitized public repo and a concrete agentic AI roadmap. The production workflow is AppSheet, Google Sheets, Google Apps Script, and QuickBooks Online oriented today. The agent layer is designed around the same source-of-truth model so AI can classify, summarize, draft, and propose actions safely before tool execution.

The wrong way to describe it:

> This is already a fully autonomous AI agent.

That would be inaccurate and less impressive than the truth.

---

Author: ChatGPT / OpenAI  
Model: GPT-5 Codex  
Created: May 29, 2026, 8:56 PM EDT  
Lineage: original
