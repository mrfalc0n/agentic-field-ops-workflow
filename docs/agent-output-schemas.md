# Agent Output Schemas

## Purpose

These schemas show how the planned agents should return machine-checkable recommendations instead of free-form prose.

The goal is to make model output boring enough for automation to trust after validation. Interesting prose can go in a reviewer summary. State changes should come from structured fields.

## Intake Classification Schema

```json
{
  "name": "intake_classification",
  "strict": true,
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "source_intake_id": {
        "type": "string"
      },
      "job_type": {
        "type": "string",
        "enum": ["touch_up", "repair_repaint", "full_repaint", "inspection", "other"]
      },
      "normalized_notes": {
        "type": "string"
      },
      "missing_fields": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["job_date", "property", "unit", "job_type", "painter", "po_number", "notes"]
        }
      },
      "duplicate_risk": {
        "type": "string",
        "enum": ["low", "medium", "high"]
      },
      "recommended_action": {
        "type": "string",
        "enum": ["promote", "request_more_info", "merge_review", "reject"]
      },
      "approval_required": {
        "type": "boolean"
      },
      "reviewer_summary": {
        "type": "string"
      }
    },
    "required": [
      "source_intake_id",
      "job_type",
      "normalized_notes",
      "missing_fields",
      "duplicate_risk",
      "recommended_action",
      "approval_required",
      "reviewer_summary"
    ]
  }
}
```

## Exception Queue Schema

```json
{
  "name": "exception_review",
  "strict": true,
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "job_id": {
        "type": "string"
      },
      "exception_type": {
        "type": "string",
        "enum": ["missing_painter", "stale_follow_up", "invoice_blocked", "date_conflict", "unknown"]
      },
      "risk_level": {
        "type": "string",
        "enum": ["low", "medium", "high"]
      },
      "recommended_action": {
        "type": "string",
        "enum": ["assign_owner", "request_update", "prepare_invoice_review", "defer", "no_action"]
      },
      "approval_required": {
        "type": "boolean"
      },
      "reviewer_summary": {
        "type": "string"
      }
    },
    "required": [
      "job_id",
      "exception_type",
      "risk_level",
      "recommended_action",
      "approval_required",
      "reviewer_summary"
    ]
  }
}
```

## Invoice Note Draft Schema

```json
{
  "name": "invoice_note_draft",
  "strict": true,
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "job_id": {
        "type": "string"
      },
      "invoice_note": {
        "type": "string"
      },
      "excluded_internal_context": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "missing_invoice_fields": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["customer_ref", "service_item_ref", "amount", "po_number", "job_date", "work_description"]
        }
      },
      "customer_facing_risk": {
        "type": "string",
        "enum": ["low", "medium", "high"]
      },
      "approval_required": {
        "type": "boolean"
      }
    },
    "required": [
      "job_id",
      "invoice_note",
      "excluded_internal_context",
      "missing_invoice_fields",
      "customer_facing_risk",
      "approval_required"
    ]
  }
}
```

## Validation Rules

- Reject unknown enum values.
- Reject output that references job IDs not present in the source context.
- Reject invoice drafts when required invoice fields are missing.
- Reject customer-facing invoice text that includes internal-only notes.
- Store the schema name and version with the audit record.

---

Author: ChatGPT / OpenAI  
Model: GPT-5 Codex  
Created: May 29, 2026, 8:56 PM EDT  
Lineage: original
