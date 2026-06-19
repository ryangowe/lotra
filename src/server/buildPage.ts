import { resolve } from "node:path";
import tailwind from "bun-plugin-tailwind";

export async function buildPage(): Promise<{
  html: string;
  assets: Record<string, Response>;
}> {
  const uiDir = resolve(import.meta.dir, "../ui");

  const result = await Bun.build({
    entrypoints: [resolve(uiDir, "page.html")],
    root: uiDir,
    target: "browser",
    publicPath: "/",
    minify: true,
    plugins: [tailwind],
  });

  if (!result.success) {
    throw new Error(
      `Page build failed:\n${result.logs.map((l) => l.message).join("\n")}`,
    );
  }

  let html = "";
  const assets: Record<string, Response> = {};

  for (const output of result.outputs) {
    if (output.path.endsWith(".html")) {
      html = await output.text();
    } else {
      const routePath = output.path.startsWith("./")
        ? output.path.slice(1)
        : `/${output.path}`;
      assets[routePath] = new Response(await output.arrayBuffer(), {
        headers: {
          "Content-Type": output.type,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  if (!html) {
    throw new Error("Page build produced no HTML output");
  }

  return { html, assets };
}
