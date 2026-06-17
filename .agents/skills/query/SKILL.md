---
name: query
description: Token-efficient wiki lookup for 50Hz gameplay, economy, controls, events, balance, and implementation guardrail questions that need prior design support.
---

# Query Skill

Trigger only when the user explicitly asks to query, check, or use the wiki, or when a gameplay/design answer depends on documented 50Hz canon and no narrower skill clearly identifies the page.

Do not use this skill for routine code edits, framework debugging, test failures, formatting, repo navigation, or implementation tasks unless the prompt asks for wiki-backed context or the code change depends on a documented gameplay decision.

## Procedure

1. Run the compact index first when you need orientation:
   ```bash
   python3 scripts/wiki.py index
   ```
2. Search metadata, headings, and page bodies without loading full files:
   ```bash
   python3 scripts/wiki.py search "<query>"
   ```
3. Read only the top relevant wiki pages under `wiki/gameplay/`.
4. If the wiki is insufficient, say what is missing instead of filling gaps with realism or speculation.
5. When the answer creates durable gameplay knowledge, create or update the relevant wiki page metadata and `wiki/index.md`.

## Rules

- Do not answer from memory when wiki support is available in the repo.
- State when evidence is absent or only indirectly supported.
- Preserve the manual-control-room loop and the documented economy invariants.
