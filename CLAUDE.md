# CLAUDE.md

The public docs site for Mythic Analytics, published at documentation.ai. MDX pages plus `openapi/*.yaml` specs, navigation in `documentation.json`. Content is grounded in the source repo at `../mythic-analytics` (`workers/src/*`, `sdk/src`) — when the two disagree, the source is right and the page is stale.

**This repo is live.** There is no CI and no staging: what lands on `main` is what the site publishes, and the site validates at publish time. A bad page is discovered by the site rejecting it, after the push. So run the checks before committing.

## Before committing

```bash
git config core.hooksPath .githooks     # once per clone — wires the checks below
node scripts/check-components.mjs       # every .mdx, or pass specific files
node ../mythic-analytics/scripts/check-openapi.mjs openapi/<spec>.yaml
```

The pre-commit hook runs both against staged files.

## Components

Only the Documentation.AI set is supported: `Callout`, `Card`, `CodeGroup`, `Columns`, `Expandable`, `ExpandableGroup`, `Iframe`, `Image`, `ParamField`, `Request`, `Response`, `ResponseField`, `Step`, `Steps`, `Tab`, `Tabs`, `Update`, `Video`.

**Every admonition is a `Callout` with a `kind`** (`info`, `alert`, `warning`, `tip`, `note`, `success`). `<Warning>`, `<Note>`, `<Info>`, `<Tip>`, `<Danger>` are Mintlify components that most docs frameworks accept and this one rejects — they are the recurring mistake, and `scripts/check-components.mjs` exists to catch them. Same for `<Accordion>` (use `Expandable`) and `<CardGroup>` (use `Columns`).

Full component reference: the `documentation-ai` skill.

## OpenAPI

An unquoted comma or colon inside a YAML flow mapping — `description: Raw upstream detail, when there is one.` — parses locally into a junk key and gets the whole spec rejected by the site. Quote any flow-mapping string containing `,` or `:`. `check-openapi.mjs` catches exactly this.

## Pushing

The remote is HTTPS and belongs to the `Stockotaco` GitHub account:

```bash
gh auth switch --user Stockotaco   # the default VisionLabs24 account gets a 403
git push origin main
gh auth switch --user VisionLabs24 # switch back afterwards
```

Doc changes ship **with** the code change they describe — a route, request/response shape, auth rule, or SDK surface that changed in `../mythic-analytics` and isn't reflected here means the published site is wrong.
