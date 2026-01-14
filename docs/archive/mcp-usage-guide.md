# MCP Server Usage Plan

**Created:** January 9, 2026  
**Status:** Approved  
**Project:** Cold Email Command Center

---

## Overview

This document defines the structured approach for using MCP (Model Context Protocol) servers throughout development. No more "winging it" — every non-trivial task follows this protocol.

---

## TIER 1: MANDATORY (Every Non-Trivial Task)

| Server | Purpose | When |
|--------|---------|------|
| **sequential-thinking** | Structured reasoning for complex problems | Start of any multi-step task, debugging, design decisions |
| **exa** (get_code_context_exa) | Current best practices, code examples | Before implementing any feature to validate approach |

**Rule:** These two servers are used together. Sequential-thinking for reasoning, exa for research. Both complement each other.

---

## TIER 2: DOCUMENTATION (As Needed)

| Server | Purpose | When |
|--------|---------|------|
| **next-devtools** (nextjs_docs) | Next.js APIs, patterns, configuration | Any Next.js-specific question |
| **shadcn** | Component discovery, code, examples | Before creating any UI component |
| **tailwind** | CSS utilities, complex styling | Styling questions, responsive patterns |
| **context7** | Other library documentation | Non-Next.js library questions |

---

## TIER 3: COMPONENT CREATION

| Server | Purpose | Priority |
|--------|---------|----------|
| **shadcn** (search → view → examples) | Existing components from registry | **PRIMARY** - always check first |
| **magic-21st** | Generate custom components | **FALLBACK** - only if shadcn lacks it |

**Workflow:**
1. `mcp_shadcn_search_items_in_registries` — Find component
2. `mcp_shadcn_view_items_in_registries` — Get component code
3. `mcp_shadcn_get_item_examples_from_registries` — Get usage examples
4. If not found → `mcp_magic-21st_21st_magic_component_builder`

---

## TIER 4: RUNTIME DEBUGGING

| Server | Purpose | When |
|--------|---------|------|
| **nextjs_index** | Discover running Next.js servers | When app is running |
| **nextjs_call** | Get runtime errors, routes, diagnostics | Debugging running app |

---

## TIER 5: SITUATIONAL

| Server | Purpose | When |
|--------|---------|------|
| **figma** | Design-to-code | Only with user-provided Figma links |
| **taskmaster** | Task tracking | Multi-session projects, complex refactors |

---

## Standard Workflow

```
1. THINK    → sequential-thinking (break down the problem)
2. RESEARCH → exa (get current best practices)
3. LOOKUP   → shadcn/next-devtools/tailwind (get specific docs)
4. IMPLEMENT → with design tokens from /src/lib/design-tokens.ts
5. VERIFY   → nextjs_index/nextjs_call (check runtime)
```

---

## Scenario-Based Protocols

### Scenario 1: Implementing a New Feature
1. Use `sequential-thinking` to break down the feature
2. Use `exa/get_code_context_exa` to find current best practices
3. Check `shadcn` for existing components we can use
4. Use `next-devtools/nextjs_docs` if Next.js-specific
5. Implement with proper design tokens
6. Use `nextjs_index/nextjs_call` to verify no runtime errors

### Scenario 2: Fixing a UI Issue
1. Use `sequential-thinking` to analyze the problem
2. Check `tailwind` docs for correct utility classes
3. Check `shadcn` examples for proper component usage
4. Fix and verify

### Scenario 3: Creating a New Component
1. Search `shadcn` registry first
2. If exists: use `view_items` + `get_item_examples`
3. If not: use `magic-21st` to generate
4. Integrate following design tokens

### Scenario 4: Planning/Refactoring
1. Use `sequential-thinking` for analysis
2. Use `taskmaster` to track tasks
3. Execute systematically

---

## MCP Server Reference

### Get Work Done
- `mcp_sequential-thinking_sequentialthinking` — Structured problem-solving
- `mcp_exa_get_code_context_exa` — Code search and context
- `mcp_exa_web_search_exa` — General web search
- `mcp_context7_resolve-library-id` → `mcp_context7_query-docs` — Library docs
- `mcp_taskmaster_*` — Task management

### Design Work
- `mcp_shadcn_search_items_in_registries` — Find components
- `mcp_shadcn_view_items_in_registries` — Get component code
- `mcp_shadcn_get_item_examples_from_registries` — Get examples
- `mcp_shadcn_get_add_command_for_items` — Get install command
- `mcp_next-devtools_nextjs_docs` — Next.js documentation
- `mcp_next-devtools_nextjs_index` — Discover running servers
- `mcp_next-devtools_nextjs_call` — Call runtime tools
- `mcp_tailwind_fetch_tailwindcss_documentation` — Tailwind docs
- `mcp_tailwind_search_tailwindcss_documentation` — Search Tailwind
- `mcp_magic-21st_21st_magic_component_builder` — Generate components
- `mcp_figma_get_design_context` — Figma to code

---

## Enforcement

This plan is **mandatory**. Failure to follow results in:
- Haphazard, inconsistent implementations
- Outdated patterns
- Wasted time debugging preventable issues

**No exceptions. No shortcuts.**

