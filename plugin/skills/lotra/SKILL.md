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
  file                     open file in browser

Options:
  -h, --help               display help for command

Commands:
  relay <file>             wait for user comments, output to stdout
  handoff <file>           output current comments to stdout
  resolve <file> <ids...>  mark comments as resolved
  status                   show open files
  prompt                   print agent instructions to stdout
```

## Workflow

### Request feedback

Use `lotra relay <file>` to open the markdown document in the browser
and block, waiting for the user's feedback.

The command returns the user's comments, along with the content those comments refer to.

### Read comments

For a document that has gone through the lotra flow, this is another way to get feedback.

You can read the user's feedback in the markdown document at any time
with `lotra handoff <file>`.

### Read the document directly

You can get the user's feedback by reading the document directly.

All comments the user leaves through lotra
are written back directly below the commented block, using markdown callout syntax.

### Mark resolved

After you have addressed the concerns based on the user's comments,
use `lotra resolve <file> <id...>`
to mark the comments as resolved.

You can of course still edit the markdown document itself,
but never edit a comment callout directly.

## Install

If `lotra` is not found, install it:

```bash
bun install -g @ryangowe/lotra
```
