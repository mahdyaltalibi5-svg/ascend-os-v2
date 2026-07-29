# Future Agent Instructions

- Read the relevant documentation before editing.
- Preserve organization scoping.
- Preserve Personal OS user scoping; personal priorities, notes, focus blocks, goals, daily plans, and notifications must be constrained by both `organizationId` and `userId`.
- Preserve revenue integrity; store money as integer cents, validate linked records by active organization, and prefer adjustments over silent financial rewrites.
- Preserve sales integrity; respect own-vs-all permissions, suppression checks, SSRF protections, provider usage caps, and server-only provider keys.
- Never bypass server-side permission checks.
- Never invent functional integrations.
- Never fake Google Places, dialer, calendar, SMS, Stripe, or AI provider results.
- Never label deterministic recommendations as external AI output.
- Add tests for new features.
- Run lint, typecheck, tests, and build before completion.
- Do not weaken security to make tests pass.
- Keep migrations reviewable.
- Update documentation when architecture changes.
- Avoid large unrelated refactors.
- State assumptions clearly.
- Report any command that could not be run.
