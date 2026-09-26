import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { HmrContext, Plugin, ViteDevServer } from "vite";

const VIRTUAL_MODULE_ID = "virtual:svg-sprite-register";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const ICON_USAGE_PATTERN = /<svg-icon\b[^>]*?\bname="([^"]+)"/g;

type SvgSpriteOptions = {
  /** Directory that is scanned for `.svg` icons, recursively. */
  iconDir: string;
  /** Source directory scanned for `<svg-icon name="...">` usages. */
  srcDir?: string;
  /** Icon names to include; defaults to the icons the source uses. */
  icons?: string[];
  /** Prefix of every generated `<symbol>` id. */
  symbolPrefix?: string;
  /** Id of the injected sprite container. */
  domId?: string;
};

/**
 * Builds the icon sprite that `<svg-icon name="...">` resolves through
 * `#icon-<name>`.
 *
 * This replaces `vite-plugin-svg-icons`, whose `svg-baker` dependency pinned
 * `postcss@5` and `micromatch@3` exactly and pulled advisories into the build
 * tree. The output matches what the previous plugin produced: one `<symbol>`
 * per icon, inner ids prefixed per icon to avoid collisions, and a hidden
 * `<svg id="__svg__icons__dom__">` container injected on import.
 *
 * Only the icons the source actually uses are embedded, because the remaining
 * `.svg` files are imported directly as URLs and would otherwise ship twice.
 */
export function svgSprite({
  iconDir,
  srcDir,
  icons,
  symbolPrefix = "icon",
  domId = "__svg__icons__dom__",
}: SvgSpriteOptions): Plugin {
  const spriteIcons = () => (icons ?? usedIconNames(srcDir) ?? allIconNames(iconDir));

  return {
    name: "sub-store-svg-sprite",
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
      return undefined;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined;
      return registerModule(buildSprite(iconDir, spriteIcons(), symbolPrefix), domId);
    },
    configureServer(server) {
      server.watcher.add(iconDir);
    },
    handleHotUpdate({ file, server }: HmrContext) {
      if (isInside(iconDir, file)) {
        invalidateSprite(server);
        return [];
      }
      // A template can start using a different icon, which changes the sprite.
      if (srcDir && file.endsWith(".vue") && isInside(srcDir, file)) invalidateSprite(server);
      return undefined;
    },
  };
}

function invalidateSprite(server: ViteDevServer) {
  const module = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
  if (module) server.moduleGraph.invalidateModule(module);
  server.ws.send({ type: "full-reload" });
}

function isInside(dir: string, file: string) {
  const rel = relative(dir, file);
  return Boolean(rel) && !rel.startsWith("..") && !rel.includes(`..${sep}`);
}

/** Icon names referenced by `<svg-icon name="...">`, or undefined when none are found. */
function usedIconNames(srcDir: string | undefined) {
  if (!srcDir) return undefined;
  const names = new Set<string>();
  for (const file of sourceFiles(srcDir)) {
    const source = readFileSync(file, "utf8");
    ICON_USAGE_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(ICON_USAGE_PATTERN)) names.add(match[1]);
  }
  return names.size > 0 ? [...names].sort() : undefined;
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(vue|ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

function allIconNames(iconDir: string) {
  return iconFiles(iconDir).map((file) => relative(iconDir, file).slice(0, -".svg".length));
}

function buildSprite(iconDir: string, iconNames: string[], symbolPrefix: string) {
  return [...iconNames]
    .sort()
    .map((iconName) => {
      const parts = iconName.split(sep);
      const source = readFileSync(join(iconDir, `${iconName}.svg`), "utf8");
      return toSymbol(source, [symbolPrefix, ...parts].join("-"), parts.join("_"));
    })
    .join("");
}

function iconFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...iconFiles(path));
    else if (entry.name.endsWith(".svg")) files.push(path);
  }
  return files;
}

function toSymbol(source: string, symbolId: string, idPrefix: string) {
  const viewBox = /<svg\b[^>]*\bviewBox="([^"]*)"/i.exec(source)?.[1];
  const body = source
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg\s*>\s*$/i, "")
    .replace(/>\s+</g, "><")
    .trim();
  return `<symbol${viewBox ? ` viewBox="${viewBox}"` : ""} id="${symbolId}">${prefixIds(body, idPrefix)}</symbol>`;
}

/** Namespaces the ids inside one icon so two icons cannot collide in the sprite. */
function prefixIds(markup: string, prefix: string) {
  const ids = [...new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))];
  let result = markup;
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result
      .replace(new RegExp(`id="${escaped}"`, "g"), `id="${prefix}_${id}"`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, "g"), `url(#${prefix}_${id})`)
      .replace(new RegExp(`(xlink:href|href)="#${escaped}"`, "g"), `$1="#${prefix}_${id}"`);
  }
  return result;
}

function registerModule(sprite: string, domId: string) {
  return `const sprite = ${JSON.stringify(sprite)};
const domId = ${JSON.stringify(domId)};

function mountSprite() {
  if (typeof document === "undefined" || document.getElementById(domId)) return;
  const container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  container.setAttribute("aria-hidden", "true");
  container.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  container.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  container.setAttribute("id", domId);
  container.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
  container.innerHTML = sprite;
  document.body.insertBefore(container, document.body.firstChild);
}

if (typeof window !== "undefined") {
  if (document.body) mountSprite();
  else document.addEventListener("DOMContentLoaded", mountSprite, { once: true });
}

export default sprite;
`;
}