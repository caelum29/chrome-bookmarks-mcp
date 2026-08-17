# Open questions
Tier: **unresolved**. Path is always OQ → ADR → issue, never a shortcut. Numbering is a human decision.

- **OQ-1** Bridge protocol framing: JSON-RPC over WS or a minimal `{id, method, params}` envelope? (Leaning
  minimal envelope; JSON-RPC only if a second client appears.) → decide before milestone 0003.
- **OQ-2** Snapshot retention: keep N latest vs age-based; is a snapshot before *every* batch too noisy for
  small ops? → measure in 0003 (count + size on a real profile), then ADR.
- **OQ-3** Do we ship the extension via Chrome Web Store or unpacked-only? Store review time vs
  "load unpacked" friction. → after 0003 proves the write path is worth it.
- **OQ-4** SDK v2 stdio: when do Claude Desktop/Code support 2026-07-28 over stdio? (ADR-0001 revisit trigger.)
- **OQ-5** History DB on Windows/Linux paths and locking behaviour — macOS only until proven otherwise.
- **OQ-6** Dead-link probing is open-world network activity from the user's machine; opt-in flag name and
  rate limits. → ADR when the tool is planned.
- **OQ-7** ADR-0004 row "`test_map.md` + `InstructionsLoaded` audit hook" — trigger (>2 rules files) fired on day 0.
  Adopt (issue) or raise the threshold via a superseding ADR? Decision is Artem's; until then this line is
  the record that the trigger fired.
