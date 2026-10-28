# Domain Docs

This repository uses a single-context layout.

## Before exploring, read these

- `GLOSSARY.md` at the repository root for domain vocabulary.
- Relevant ADRs in `docs/adr/` for decisions affecting the area being explored or changed.

If either is absent, proceed silently. The `/domain-modeling` skill creates these files lazily when a domain term or decision is resolved.

## File structure

- `GLOSSARY.md`: the repository's domain glossary.
- `docs/adr/NNNN-short-title.md`: architecture decision records, numbered sequentially.

## Use the glossary's vocabulary

Use terms defined in `GLOSSARY.md` in issue titles, refactor proposals, hypotheses, and test names. Respect any synonyms the glossary explicitly avoids.

If a needed concept is missing, check whether an existing term already covers it; otherwise note the gap for `/domain-modeling`.

## Flag ADR conflicts

When a proposal contradicts an existing ADR, identify the ADR and explain why the decision should be reopened before changing it.
