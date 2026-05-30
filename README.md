# Agentic Field Ops Workflow

Sanitized public proof asset for a lightweight field-operations system built around AppSheet, Google Sheets, Google Apps Script, and QuickBooks Online integration patterns.

This repository is a public, client-agnostic version of a real Arcwise field-operations workflow. It shows how messy job intake, scheduling context, exception handling, payout review, and invoice preparation can be turned into a structured operating layer that is ready for human-in-the-loop AI agents.

Built by Arcwise. Broader product and systems context lives in the [Arcwise Systems Portfolio](https://github.com/mrfalc0n/arcwise-systems-portfolio).

## What This Demonstrates

- Product discovery from a real small-business workflow, not a synthetic demo.
- A practical low-code architecture using tools the business could actually operate.
- A source-of-truth model that separates intake, operational records, summaries, and accounting actions.
- Agentic AI design patterns: classify, normalize, detect exceptions, propose actions, wait for approval, execute through tools, and audit the result.
- Security judgment: no credentials, customer data, private spreadsheet IDs, or live QuickBooks configuration are included.

## Problem

The original operating flow depended on unstructured messages, calls, notes, spreadsheet updates, and manual invoice preparation. That created predictable failure modes:

- Work requests arrived in inconsistent formats.
- The owner had to remember context across texts, calls, and notes.
- Job status, painter assignment, notes, and invoice readiness were scattered.
- Weekly review and payout workflows required manual spreadsheet gymnastics.
- Invoice preparation depended on people knowing which fields mattered.

## Solution Pattern

The system creates a simple operating layer:

1. AppSheet provides a mobile-friendly front door for new jobs and operational updates.
2. Google Sheets remains the structured source of truth.
3. Google Apps Script handles validation, promotion, refresh logic, backup, and integration glue.
4. QuickBooks Online integration patterns support invoice creation from prepared job records.
5. Future agent workflows can sit above the same structured layer instead of scraping chaos.

## Repository Map

- [docs/product-brief.md](docs/product-brief.md) - PM framing, users, constraints, metrics, and decisions.
- [docs/architecture.md](docs/architecture.md) - system architecture and source-of-truth boundaries.
- [docs/agentic-ai-roadmap.md](docs/agentic-ai-roadmap.md) - practical AI agent roadmap.
- [docs/qbo-integration.md](docs/qbo-integration.md) - sanitized QuickBooks Online integration design.
- [docs/security-and-sanitization.md](docs/security-and-sanitization.md) - what was removed and why.
- [docs/show-us-what-im-building.md](docs/show-us-what-im-building.md) - concise job-application narrative.
- [docs/current-vs-planned.md](docs/current-vs-planned.md) - honest line between deployed automation and agent roadmap.
- [diagrams/architecture.mmd](diagrams/architecture.mmd) - Mermaid architecture diagram.
- [diagrams/agent-loop.mmd](diagrams/agent-loop.mmd) - Mermaid agent loop diagram.
- [examples/mock-data/jobs.csv](examples/mock-data/jobs.csv) - safe example job records.
- [appscript/intake_processor_sample.js](appscript/intake_processor_sample.js) - sanitized Apps Script-style sample.
- [appscript/qbo_invoice_payload_sample.js](appscript/qbo_invoice_payload_sample.js) - sanitized invoice payload example.

## Why This Is Agentic

The first version is intentionally practical automation. The agentic layer is designed around a safer operating pattern:

```text
Observe -> classify -> normalize -> detect exceptions -> propose action -> human approval -> execute tool -> audit
```

That matters because small-business operations are full of partial context, ambiguous instructions, and expensive edge cases. The right design is not "let the bot do everything." It is a controlled workflow where agents prepare, explain, and execute bounded actions.

## Status

This is a sanitized public case-study repository. It is not the private production implementation.

What exists today:

- A real workflow pattern using AppSheet, Google Sheets, Google Apps Script, and QuickBooks Online integration concepts.
- Sanitized code samples that show intake promotion and invoice payload preparation.
- A source-of-truth model for operational jobs, exception queues, summaries, and invoice-ready context.

What is intentionally roadmap:

- LLM-based intake classification.
- Agent-authored exception summaries.
- AI-generated invoice-note drafts.
- Weekly operations brief generation.
- Approved tool execution against accounting workflows.

## Project Narrative

I built a lightweight field-operations workflow that turns messy job requests, scheduling context, and invoice notes into a structured operating layer using AppSheet, Google Sheets, Google Apps Script, and QuickBooks Online integration patterns. What I am most proud of is the product design: it maps real operational friction into a human-in-the-loop automation system, with a clear roadmap for agentic AI capabilities like intake classification, invoice-note generation, exception detection, weekly business briefings, and approval-based accounting actions.

---

Author: ChatGPT / OpenAI  
Model: GPT-5 Codex  
Created: May 29, 2026, 8:38 PM EDT  
Lineage: original, revised from prior AI draft
