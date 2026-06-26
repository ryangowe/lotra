# LoTRA

**Lo**ng **T**ext **R**eview and **A**nnotate

Reviewing long LLM-generated documents is painful in a terminal. LoTRA renders them in the browser where you can comment on individual blocks — paragraphs, list items, headings — then hands structured feedback back to the agent.

## Install as a Claude Code plugin

This is the main way to use LoTRA. Once installed, the agent routes long replies, specs, and plans through LoTRA for inline human review before treating them as done.

```
/plugin marketplace add ryangowe/lotra
/plugin install lotra@lotra
```

The plugin bundles a skill, so the agent knows when to reach for LoTRA, and hooks, so long output and plans are gated on your review. LoTRA runs via `bunx @ryangowe/lotra`, so [Bun](https://bun.sh) must be on your PATH.

## Install as a standalone CLI

To drive LoTRA yourself, without the plugin:

```bash
bun install -g @ryangowe/lotra   # adds the `lotra` command
```

Or run it on demand without installing:

```bash
bunx @ryangowe/lotra ./doc.md
```

## How It Works

```
agent writes doc.md
  → lotra review ./doc.md       # open in browser, block until user submits
  ← <comment> / <note> on stdout
  → agent rewrites based on feedback
  → lotra resolve ./doc.md c1   # mark comments resolved
```

The plugin drives this loop automatically; the CLI exposes each step on its own.

Comments are stored as GFM callout blocks inline in the markdown file, attached to the block they annotate:

```markdown
> [!comment] id="c1" status="requested"
> The data here is from 2023, should be 2024.
```

## Commands

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
```

`handoff` accepts `--exclude-notes` to drop notes from its output.

## Comment States

| Status      | In agent output                     | Meaning                                                  |
| ----------- | ----------------------------------- | -------------------------------------------------------- |
| `requested` | `<comment>`                         | User wants the agent to act: modify, explain, or respond |
| `note`      | `<note>` (unless `--exclude-notes`) | Informational context; no action required                |
| `resolved`  | —                                   | Addressed; folded away in the browser                    |

## License

MIT
