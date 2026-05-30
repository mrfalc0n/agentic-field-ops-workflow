# Security And Sanitization

## Public Repo Rule

This repository is a sanitized proof asset. It is not a production export.

The goal is to show product thinking, architecture, and agentic design patterns without exposing client identity, customer data, credentials, sheet IDs, script IDs, or accounting configuration.

## Removed Or Generalized

- Client name and branding.
- Real user names and emails.
- Customer/property records.
- Spreadsheet IDs.
- Apps Script deployment IDs.
- QuickBooks Online realm ID.
- OAuth client ID and client secret.
- Access and refresh tokens.
- Production URLs.
- Private comments and internal working notes.
- Any field values that could identify a real job, customer, or vendor.

## Safe Public Substitutions

- Generic field-service business language.
- Mock job records.
- Sanitized Apps Script-style examples.
- Mermaid diagrams.
- Architecture and product docs.
- Configuration templates instead of real configuration.

## Sensitive Data Checklist

Before publishing or updating this repo:

- Search for emails.
- Search for phone numbers.
- Search for spreadsheet, document, and script IDs.
- Search for OAuth terms such as `client_secret`, `refresh_token`, `access_token`, and `realm_id`.
- Search for customer names and addresses.
- Search for private business names.
- Confirm `.clasp.json`, `.clasprc.json`, `.env`, and local config files are not included.
- Confirm mock data is obviously fake.

## AI Safety Posture

AI agents should operate with least privilege:

- Read structured views, not the entire backend when avoidable.
- Propose before executing.
- Require approval for accounting and customer-facing actions.
- Log what was observed, proposed, approved, executed, and changed.
- Use narrow tools with explicit schemas.
- Never store secrets in prompts, docs, or repo files.

## Why This Matters

Agentic AI products fail when they confuse capability with authority. A system can be powerful and still be disciplined. The practical pattern is compartmentalized access, narrow tools, human approval for high-trust actions, and clear audit trails.

---

Author: ChatGPT / OpenAI  
Model: GPT-5 Codex  
Created: May 29, 2026, 8:38 PM EDT  
Lineage: original
