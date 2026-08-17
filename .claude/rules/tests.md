---
paths: ["**/test/**", "**/*.test.ts"]
---
# Test integrity
- A failing test is information. Never delete, skip, `.only`, weaken an assertion or rewrite a test to
  make the suite pass. If the test is wrong, stop and say why — the human decides.
- Bug fix → the reproduction test is written (or approved) by the human before the fix.
- Fixtures under `test/fixtures/` are synthetic. Never paste a real `Bookmarks` file (public repo).
- Handler tests never import `@modelcontextprotocol/*`; the only SDK-touching tests are `test/mcp/*`
  (InMemoryTransport).
- Test names state the observable behaviour, not the function name.
