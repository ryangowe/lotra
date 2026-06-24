import type { Root, List } from "mdast";
import { parser, stringifier } from "./parser.ts";

import { toString } from "mdast-util-to-string";

const MIN_ITEMS_TO_SPLIT = 3;
const MIN_ITEM_LENGTH_TO_SPLIT = 40;

function shouldSplit(list: List): boolean {
  if (list.children.length >= MIN_ITEMS_TO_SPLIT) return true;
  return list.children.some(
    (item) => toString(item).length >= MIN_ITEM_LENGTH_TO_SPLIT,
  );
}

function splitLists(tree: Root): Root {
  const children: Root["children"] = [];
  for (const node of tree.children) {
    if (
      node.type !== "list" ||
      node.children.length <= 1 ||
      !shouldSplit(node as List)
    ) {
      children.push(node);
      continue;
    }
    const list = node as List;
    for (let i = 0; i < list.children.length; i++) {
      children.push({
        type: "list",
        ordered: list.ordered,
        start: list.ordered ? (list.start ?? 1) + i : null,
        spread: false,
        children: [list.children[i]!],
      } as List);
    }
  }
  return { ...tree, children };
}

export function prettify(markdown: string): string {
  const tree = parser.runSync(parser.parse(markdown)) as Root;
  const transformed = splitLists(tree);
  return stringifier.stringify(transformed).trimEnd() + "\n";
}
