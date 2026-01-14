# Post-Mortem: Native Select vs shadcn Select

**Date**: January 13, 2026  
**Severity**: Low (visual)

## Issue
Used native `<select>` element for timezone dropdown instead of the already-installed shadcn Select component.

## Root Cause
Defaulted to HTML primitives without checking existing UI library components first.

## Impact
Jarring visual inconsistency—native selects don't respect dark mode or match the design system.

## Prevention
1. Before using any form control, check `src/components/ui/` first
2. Native HTML elements (select, checkbox, radio) should never be used directly—always use shadcn equivalents

## Rule
If shadcn has it, use it.
