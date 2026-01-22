# Working Guide

- After adding any code or functionality, write thorough unit tests and check coverage.
- After making any changes always execute `pnpm format && pnpm test && pnpm build` to verify
- Never edit files in src/generated/
- Whenever there is any confusion or errors, suggest to me a guideline to add to AGENTS.md
- This project is being simultaneously modified while you work
- Make commits after changes, always using conventional commits
- Don't unstage or stash changes, its ok if they are irrelevant to your task
- If you notice unexpected changes while you are working, append a descriptive note to CONCURRENT_WORK.md
- If the unexpected changes are interfering with your work, prepend the message with `[ALERT!]`
- If you are making a commit with unrelated staged changes, read the changes and append to your commit message
- If you are surprised by a file that has changed, check for notes in CONCURRENT_WORK.md
- Write unit tests with vitest for logic
- Write component tests with Ink renderer (using `ink-testing-library`)
- Write integration tests with node-pty for terminal integration
- See @docs/testing.md for more testing guidelines

## Goals

- Explicit contracts at boundaries
- No business rules in services.
- Centralize boundary validation + error mapping. Add zod DTOs for all HTTP entrypoints.
- Always use Zod for parsing types from external sources (not including the attio sdk)

# TypeScript

- **Type everything**: params, returns, config objects; avoid `any`
- **Do not reimplement SDK types or schemas**: prefer using the SDK types or schemas directly, see the attio-ts-sdk in node_modules
- **Use interfaces**: for complex types and objects
- **Use namespaces**: for organizing related types and functions
- **Make Illegal States Unrepresentable**: If something should never happen, encode that rule in the type system instead of comments or runtime checks.
  - Discriminated unions instead of flags + nullable fields
  - Narrowed constructors / factory functions
- **Avoid Type Assertions (as)**: Every as is a potential runtime crash hidden from the compiler.
  - Replace with: Narrowing functions or Exhaustive pattern matching or Refined input types
- **Prefer Union Types Over Boolean Flags**: Boolean flags destroy invariants.
- **Separate Pure Logic from Side Effects**: Functions that return void hide meaning from the compiler.
  - Prefer Pure functions with explicit inputs/outputs.
- **Use a single params object for a function argument when there are optional arguments or arguments of the same type**: this enables safe, name-based destructuring.
- **Add comments to tricky parts of code (no need for obvious comments)**: ensure comments on tricky code capture intent
- **Prefer undefined over null** - except at outer boundaries where it's necessary to communicate absence of a value.
- **Avoid uninformative method names** - don't use words like "handle" or "process" in names, use descriptive verbs
- **Avoid type guard functions** - prefer using the SDK types
- **Avoid creating duplicative types** - prefer to use typescript's `Pick` or `Omit` (if using Zod use `.extend`)
- **Never use Parameters<typeof ...>** - prefer destructuring or param object typing
- **Prefer well typed dispatch objects to switch statements**
