---
name: lotra
description: Route long markdown output through lotra for human review before treating it as done. Use when you have written or heavily revised a document, or when a reply is long prose, a spec, or a plan the human should comment on inline rather than read in the terminal.
---

# Review long output with lotra

lotra is a human-in-the-loop markdown annotation tool.

## CLI

```
Usage: lotra [options] [command] [file]

Long Text Review and Annotate

Arguments:
  file                      open file in browser

Options:
  -h, --help                display help for command

Commands:
  review <file>             wait for user comments, output to stdout
  handoff [options] <file>  output current comments to stdout
  resolve <file> <ids...>   mark comments as resolved
  status                    show open files
  restart                   restart the daemon
  prompt                    print agent instructions to stdout
  prettier <file>           split multi-item lists into single-item lists
```

`handoff` accepts `--exclude-notes` to omit notes from output.

## Workflow

lotra is one way to exchange information with the user. Combine it with your other workflows as appropriate.

- Treat comments like regular user input — read, think, then decide how to act.
- Don't funnel all communication through the document — reply directly when that fits better.
- Don't treat lotra review as a gate that blocks all other work — act on what's clear while clarifying the rest.

### Request feedback

Use `bun x @ryangowe/lotra review "<file>"` to open the markdown document in the browser
and block, waiting for the user's feedback.

The command returns the user's feedback in two types:

- `<comment>` — the user wants you to act on this: modify, explain, or respond.
- `<note>` — informational; context the user provides for your awareness, no action required.

### Read comments

For a document that has gone through the lotra flow, this is another way to get feedback.

You can read the user's feedback in the markdown document at any time
with `bun x @ryangowe/lotra handoff "<file>"`.

### Read the document directly

You can get the user's feedback by reading the document directly.

All comments the user leaves through lotra
are written back directly below the commented block, using markdown callout syntax.

### Comment tracking for persistent documents

For one-off long text review (dumped agent output, temporary files),
comment tracking is unnecessary — read the feedback once and move on.

For persistent documents (specs, design docs, project files) that go through
multiple rounds of review, track comments with resolve:

After you have addressed the concerns based on the user's comments,
use `bun x @ryangowe/lotra resolve "<file>" <id...>`
to mark the comments as resolved.

You can edit the markdown document itself,
but never edit a comment callout directly.

## Dump, prettify, and review

When routing long output through lotra (not an existing project file):

1. **Dump**: Write the markdown to the Scratchpad Directory. Never write temporary review files into the project directory.
2. **Prettify**: Run `bun x @ryangowe/lotra prettier "<file>"` to split complex lists into single-item blocks.
3. **Review**: Run `bun x @ryangowe/lotra review "<file>"` to open the file in the browser and wait for user comments.

When reviewing an existing project file (a spec, a doc, etc.),
skip the dump step and use the file in place.

## Constraints

- Never Write a file that contains comment callouts. Use Edit on prose paragraphs only; callout blocks belong to lotra.
- `bun x @ryangowe/lotra review` blocks until the user submits. Do not read the file while review is running. If review fails, report the error and wait for user instructions.
- Always use `bun x @ryangowe/lotra`. If not found, run `bun install -g @ryangowe/lotra` first.
- Resolve after editing: read comments → Edit prose → `bun x @ryangowe/lotra resolve "<file>"`.
