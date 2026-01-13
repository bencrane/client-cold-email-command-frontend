# MCP Tools Usage Guide

This document explains how to use the available MCP (Model Context Protocol) tools for development on this project.

---

## Overview

MCP tools extend AI capabilities beyond basic code editing. Use them strategically for:
- Documentation lookup
- Complex reasoning
- Code pattern research
- Task management

---

## 1. Sequential Thinking (`mcp_sequential-thinking_sequentialthinking`)

**Purpose:** Break down complex problems into manageable steps with revision capability.

**When to use:**
- Multi-step architectural decisions
- Debugging complex issues
- Planning implementation approaches
- Problems where the full scope isn't clear initially

**How to use:**
```
Call with:
- thought: Current thinking step
- thoughtNumber: Current step (1, 2, 3...)
- totalThoughts: Estimated total needed (can adjust)
- nextThoughtNeeded: true if more thinking required
- isRevision: true if reconsidering previous thought
```

**Best practices:**
- Start with rough estimate, adjust as needed
- Don't hesitate to revise earlier conclusions
- Express uncertainty when present
- Generate hypothesis, verify, repeat until confident

---

## 2. Context7 (`mcp_context7_resolve-library-id` + `mcp_context7_query-docs`)

**Purpose:** Fetch up-to-date documentation for any library/framework.

**When to use:**
- Checking current API syntax
- Understanding library behavior
- Finding code examples
- Verifying best practices

**How to use:**
1. First resolve the library ID:
```
mcp_context7_resolve-library-id
- libraryName: "react" (or whatever library)
- query: "What you're trying to accomplish"
```

2. Then query the docs:
```
mcp_context7_query-docs
- libraryId: "/vercel/next.js" (from step 1)
- query: "How to set up authentication with JWT"
```

**Best practices:**
- Be specific in queries
- Don't call more than 3 times per question
- Use for ANY library-specific questions

---

## 3. Exa (`mcp_exa_web_search_exa` + `mcp_exa_get_code_context_exa`)

**Purpose:** Web search and code context retrieval.

### `mcp_exa_get_code_context_exa`
**When to use:**
- Finding code patterns for APIs, libraries, SDKs
- Getting implementation examples
- Understanding how others solved similar problems

```
- query: "React useState hook examples"
- tokensNum: 5000 (adjust 1000-50000 based on need)
```

### `mcp_exa_web_search_exa`
**When to use:**
- Real-time information needs
- Current events or recent updates
- Verifying facts

```
- query: "Your search query"
- numResults: 8 (default)
- type: "auto" | "fast" | "deep"
```

**Best practices:**
- Use `get_code_context_exa` for programming questions
- Use `web_search_exa` for general research
- Be specific with search queries

---

## 4. Taskmaster

**Purpose:** Project and task management.

**Available tools:**
- `mcp_taskmaster_get_tasks` - List all tasks
- `mcp_taskmaster_get_task` - Get specific task details
- `mcp_taskmaster_set_task_status` - Update task status
- `mcp_taskmaster_next_task` - Find next task to work on
- `mcp_taskmaster_expand_task` - Break task into subtasks
- `mcp_taskmaster_update_subtask` - Add info to subtask
- `mcp_taskmaster_parse_prd` - Generate tasks from PRD

**Status values:** pending, in-progress, done, deferred, cancelled, blocked, review

**Best practices:**
- Keep tasks updated as you work
- Use for complex multi-step projects
- Break large tasks into subtasks

---

## 5. Shadcn UI (`mcp_shadcn_*`)

**Purpose:** Search and add UI components from shadcn registry.

**Tools:**
- `mcp_shadcn_search_items_in_registries` - Find components
- `mcp_shadcn_view_items_in_registries` - View component details
- `mcp_shadcn_get_item_examples_from_registries` - Get usage examples
- `mcp_shadcn_get_add_command_for_items` - Get CLI add command

**Example workflow:**
1. Search: `{ registries: ["@shadcn"], query: "button" }`
2. View: `{ items: ["@shadcn/button"] }`
3. Get examples: `{ registries: ["@shadcn"], query: "button-demo" }`
4. Add: `{ items: ["@shadcn/button"] }`

---

## 6. 21st Magic (`mcp_magic-21st_*`)

**Purpose:** Generate UI components with AI assistance.

**Tools:**
- `21st_magic_component_builder` - Generate new components
- `21st_magic_component_inspiration` - Get design inspiration
- `21st_magic_component_refiner` - Improve existing components
- `logo_search` - Find company logos

---

## 7. Tailwind (`mcp_tailwind_*`)

**Purpose:** Tailwind CSS documentation and code search.

**Tools:**
- `fetch_tailwindcss_documentation` - Get full docs
- `search_tailwindcss_documentation` - Search docs semantically
- `search_tailwindcss_code` - Search Tailwind codebase

---

## 8. Next.js DevTools (`mcp_next-devtools_*`)

**Purpose:** Next.js development assistance.

**Tools:**
- `nextjs_docs` - Fetch official Next.js docs
- `nextjs_index` - Discover running dev servers
- `nextjs_call` - Call MCP tools on running server
- `browser_eval` - Browser automation for testing

**Note:** Requires Next.js 16+ for MCP support.

---

## 9. Figma (`mcp_figma_*`)

**Purpose:** Figma design integration.

**Tools:**
- `get_design_context` - Get UI code from Figma node
- `get_screenshot` - Screenshot Figma node
- `get_metadata` - Get node structure
- `generate_diagram` - Create diagrams in FigJam

---

## Priority Order for This Project

1. **Context7** - For Next.js, React, API documentation
2. **Sequential Thinking** - For complex debugging/architecture
3. **Exa Code Context** - For API integration patterns
4. **Taskmaster** - For tracking multi-step work
5. **Shadcn** - For UI components

---

## Anti-Patterns to Avoid

1. **Don't guess** - Use Context7/Exa to verify before implementing
2. **Don't skip sequential thinking** for complex problems
3. **Don't over-call** - Max 3 calls per tool per question
4. **Don't use web search for code** - Use `get_code_context_exa` instead
5. **Don't ignore tool results** - Read and apply what you find

