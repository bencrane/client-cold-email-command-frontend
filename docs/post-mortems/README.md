# Post-Mortems

This directory contains post-mortem analyses of development incidents, mistakes, and lessons learned. These documents exist to prevent repeated mistakes and establish quality standards.

---

## Index

| Date | Title | Severity | Key Lesson |
|------|-------|----------|------------|
| [2026-01-13](./2026-01-13-sidebar-filter-migration.md) | Sidebar Filter Migration | High | Research before implementation; this is a $10k product |

---

## Purpose

Post-mortems are written when:
- A feature ships below quality standards
- Time is wasted due to skipped process steps
- User feedback indicates a significant miss
- Technical debt is introduced unnecessarily

## For AI Agents

**Read these before starting work.** They contain:
- Common mistakes to avoid
- Quality standards for this product
- Process reminders (MCP workflow, design tokens, etc.)

## Quality Standard

This is a **premium B2B SaaS product** priced at $10k+. Every feature should meet this bar:
- Production-quality visuals
- Polished interactions
- Consistent with design system
- Would you ship this to an enterprise customer?
