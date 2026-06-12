import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { remarkComment } from "./remark-comment.ts";

export const parser = unified().use(remarkParse).use(remarkComment).freeze();

export const stringifier = unified()
  .use(remarkStringify, {
    bullet: "-",
    rule: "-",
  })
  .freeze();
