---
name: PDAM Tracker Zod Compatibility
description: Orval + Zod v3 constraints for the PDAM project openapi spec
---

## Rule
The project uses Zod v3.25.76 in `lib/api-zod`. Orval 8.x generates Zod v4 syntax for certain OpenAPI features that don't exist in v3.

## Known breakages
- `format: email` → orval generates `zod.email()` (v4 only). Remove all format:email from spec.
- `type: object` without additionalProperties → orval generates `zod.looseObject()` (v4). Use `type: ["string","null"]` for simple nullable fields, or keep objects tightly typed.
- `format: binary` / File fields → orval can't generate File/Blob types. Use base64 string instead (`type: string` for photo uploads).

**Why:** Discovered during initial codegen; reverting to compatible patterns was the only fix short of upgrading Zod.
**How to apply:** Before adding any new openapi.yaml fields, check this list. After any spec change, run `pnpm --filter @workspace/api-zod run generate` and inspect for v4 syntax.
