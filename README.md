# LoTRA

**Lo**ng **T**ext **R**eview and **A**nnotate

Reviewing long LLM-generated documents is painful in a terminal. LoTRA renders them in the browser where you can add paragraph-level comments, then hands structured feedback back to the agent.

## How It Works

```
agent writes doc.md
  → lotra ./doc.md              # open in browser
  → lotra review ./doc.md       # block until user submits
  ← structured comments on stdout
  → agent rewrites based on feedback
  → lotra resolve doc.md c1 c2  # mark comments resolved
```

Comments are stored as GFM callout blocks inline in the markdown file:

```markdown
> [!comment] id="c1" status="requested"
> The data here is from 2023, should be 2024.
```

## Usage

```bash
# Open a file for review in the browser
lotra ./doc.md

# Block until user submits comments (structured output on stdout)
lotra review ./doc.md

# Read current comments without blocking
lotra handoff ./doc.md

# Mark comments as resolved
lotra resolve ./doc.md c1 c2

# Show status of all open files
lotra status
```

## Comment States

| Status      | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| `requested` | Changes requested (included in review/handoff output)  |
| `note`      | Informational hint (agent must read the file directly) |
| `resolved`  | Addressed (folded in browser)                          |

## Installation

Requires [Bun](https://bun.sh).

```bash
bun install -g @ryangowe/lotra
```

Or run it without installing:

```bash
bunx @ryangowe/lotra ./doc.md
```

## License

MIT
