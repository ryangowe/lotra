import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkStringify from "remark-stringify";
import { remarkComment, commentBlockquoteHandler } from "./remark-comment.ts";

export const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter)
  .use(remarkComment)
  .freeze();

export const stringifier = unified()
  .use(remarkStringify, {
    bullet: "-",
    rule: "-",
    handlers: { blockquote: commentBlockquoteHandler },
  })
  .use(remarkGfm)
  .use(remarkFrontmatter)
  .freeze();
