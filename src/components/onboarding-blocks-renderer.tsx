import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExternalLink } from "lucide-react";
import { renderInlineMarkdown, type ContentBlock } from "@/lib/onboarding";

function MD({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(text) }}
    />
  );
}

function getEmbedUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    // YouTube
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Loom
    if (u.hostname.includes("loom.com")) {
      return raw.replace("/share/", "/embed/");
    }
    // Figma
    if (u.hostname.includes("figma.com")) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(raw)}`;
    }
    return raw;
  } catch {
    return null;
  }
}

export function BlocksRenderer({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground">This page is empty.</div>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return <h2 className="text-lg font-semibold tracking-tight mt-2">{block.text}</h2>;
    case "paragraph":
      return (
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          <MD text={block.text} />
        </p>
      );
    case "callout":
      return (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
          {block.label && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
              {block.label}
            </div>
          )}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            <MD text={block.text} />
          </div>
        </div>
      );
    case "card":
      return (
        <Card className="p-5">
          <div className="font-semibold mb-1.5">{block.title}</div>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            <MD text={block.body} />
          </div>
        </Card>
      );
    case "two_col":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[block.left, block.right].map((side, i) => (
            <Card key={i} className="p-5">
              <div className="font-semibold mb-1.5">{side.title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                <MD text={side.body} />
              </div>
            </Card>
          ))}
        </div>
      );
    case "table":
      return (
        <Card className="p-5">
          {block.title && <div className="font-semibold mb-3">{block.title}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {block.columns.map((c, i) => (
                    <th
                      key={i}
                      className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b py-2 px-2"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {block.columns.map((_, j) => (
                      <td key={j} className="py-2 px-2 align-top whitespace-pre-wrap">
                        <MD text={row[j] ?? ""} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );
    case "people":
      return (
        <Card className="p-5">
          {block.title && <div className="font-semibold mb-3">{block.title}</div>}
          <ul className="divide-y">
            {block.people.map((p, i) => (
              <li key={i} className="py-2.5 flex items-center gap-3">
                <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {(p.name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.name || "Unnamed"}</div>
                  {p.role && <div className="text-xs text-muted-foreground truncate">{p.role}</div>}
                </div>
                {p.slack && (
                  <div className="text-xs text-muted-foreground font-mono">{p.slack}</div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      );
    case "checklist_preview":
      return (
        <Card className="p-5">
          {block.title && <div className="font-semibold mb-3">{block.title}</div>}
          <ul className="space-y-1.5 text-sm list-disc list-inside text-foreground/90">
            {block.items.map((item, i) => (
              <li key={i} className="whitespace-pre-wrap">
                <MD text={item} />
              </li>
            ))}
          </ul>
        </Card>
      );
    case "image":
      if (!block.url) return null;
      return (
        <figure className="space-y-2">
          <img
            src={block.url}
            alt={block.alt ?? ""}
            className="w-full rounded-md border bg-muted"
            loading="lazy"
          />
          {block.caption && (
            <figcaption className="text-xs text-muted-foreground text-center">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "embed": {
      const src = getEmbedUrl(block.url);
      if (!src) return null;
      return (
        <Card className="p-3 space-y-2">
          {block.title && <div className="font-semibold text-sm px-1">{block.title}</div>}
          <div className="aspect-video w-full overflow-hidden rounded">
            <iframe
              src={src}
              className="w-full h-full border-0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={block.title || "Embed"}
            />
          </div>
        </Card>
      );
    }
    case "link_list":
      return (
        <div className="space-y-2">
          {block.title && <div className="font-semibold mb-1">{block.title}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {block.links.map((l, i) =>
              l.url ? (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block group"
                >
                  <Card className="p-3 hover:border-foreground/30 transition-colors h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{l.title || l.url}</div>
                      <ExternalLink className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    {l.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {l.description}
                      </div>
                    )}
                  </Card>
                </a>
              ) : null,
            )}
          </div>
        </div>
      );
    case "divider":
      return <hr className="border-t border-border my-2" />;
    case "accordion":
      return (
        <Card className="p-2">
          {block.title && (
            <div className="font-semibold px-3 pt-2 pb-1">{block.title}</div>
          )}
          <Accordion type="multiple" className="w-full">
            {block.items.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="px-3 text-sm text-left">
                  {item.question || "Untitled question"}
                </AccordionTrigger>
                <AccordionContent className="px-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  <MD text={item.answer} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      );
  }
}
