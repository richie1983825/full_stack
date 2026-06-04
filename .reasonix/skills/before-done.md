---
name: before-done
description: Before marking work as done: run backend tests, frontend unit tests, and verify the build passes. Every feature change must include tests.
---
# Before-done checklist

Before telling the user something is "done" or "ready to test", run these checks:

## Mandatory

1. **Frontend build**: `npm --prefix frontend run build` must pass with zero errors.
2. **Frontend unit tests**: `npm --prefix frontend test` must pass all tests.
3. **Backend compilation**: Verify the backend compiles (cargo-watch log shows "Finished dev profile" with no errors).
4. **Backend unit tests**: `cargo test --manifest-path backend/Cargo.toml` must pass.

## Every feature change MUST include tests

- **Frontend logic changes** (utilities, hooks, stores, data transformation): add Vitest unit tests in `frontend/src/__tests__/`.
- **Backend logic changes** (services, utilities, handlers): add `#[cfg(test)] mod tests` in the same file.
- **New pages or flows**: add a Playwright E2E test in `frontend/e2e/`.

## When tests fail

- Do NOT tell the user to try again. Fix the root cause first.
- If a test reveals a pre-existing bug, fix it and add a regression test.
- Run the full test suite after every fix.

## Verification order

```
write code → unit test → build → backend test → e2e test → user acceptance
```

Never skip tests to save time. If a test is missing, write it before considering the task done.
