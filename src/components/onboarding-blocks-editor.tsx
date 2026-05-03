import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BLOCK_TYPE_LABELS,
  type ContentBlock,
  emptyBlock,
} from "@/lib/onboarding";

type BlockType = ContentBlock["type"];

interface Props {
  blocks: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
}

// Stable IDs across reorders. We tag blocks with a __id symbol-free property
// only in editor state; persisted blocks don't keep this.
type IdBlock = ContentBlock & { __id: string };

function withIds(blocks: ContentBlock[]): IdBlock[] {
  return blocks.map((b, i) => ({ ...b, __id: `b-${i}-${Math.random().toString(36).slice(2, 8)}` } as IdBlock));
}
function stripIds(blocks: IdBlock[]): ContentBlock[] {
  return blocks.map(({ __id: _ignored, ...rest }) => rest as ContentBlock);
}

// Best-effort text extraction so we can preserve content when switching block type.
function extractText(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return block.text;
    case "callout":
      return block.text;
    case "card":
      return [block.title, block.body].filter(Boolean).join("\n\n");
    case "two_col":
      return [block.left.title, block.left.body, block.right.title, block.right.body]
        .filter(Boolean)
        .join("\n\n");
    case "checklist_preview":
      return block.items.filter(Boolean).join("\n");
    case "accordion":
      return block.items.map((i) => `${i.question}\n${i.answer}`).join("\n\n");
    case "link_list":
      return block.links.map((l) => l.title).filter(Boolean).join("\n");
    case "people":
      return block.people.map((p) => p.name).filter(Boolean).join("\n");
    case "table":
      return block.title ?? "";
    case "image":
      return block.caption ?? block.alt ?? "";
    case "embed":
      return block.title ?? "";
    case "divider":
      return "";
  }
}

export function convertBlock(block: ContentBlock, target: ContentBlock["type"]): ContentBlock {
  if (block.type === target) return block;
  const text = extractText(block);
  const firstLine = text.split("\n")[0] ?? "";
  switch (target) {
    case "heading":
      return { type: "heading", text: firstLine || "New heading" };
    case "paragraph":
      return { type: "paragraph", text };
    case "callout":
      return { type: "callout", label: "Note", text };
    case "card":
      return { type: "card", title: firstLine || "Card title", body: text };
    case "two_col":
      return {
        type: "two_col",
        left: { title: firstLine || "Left title", body: text },
        right: { title: "Right title", body: "" },
      };
    case "checklist_preview":
      return {
        type: "checklist_preview",
        items: text ? text.split("\n").filter(Boolean) : [""],
      };
    case "accordion":
      return { type: "accordion", items: [{ question: firstLine || "", answer: text }] };
    case "link_list": {
      if (block.type === "embed" || block.type === "image") {
        return { type: "link_list", links: [{ title: firstLine || block.url, url: block.url }] };
      }
      return { type: "link_list", links: [{ title: firstLine || "", url: "" }] };
    }
    case "image":
      if (block.type === "embed") return { type: "image", url: block.url, alt: "", caption: text };
      return { type: "image", url: "", alt: "", caption: text };
    case "embed":
      if (block.type === "image") return { type: "embed", url: block.url, title: text };
      return { type: "embed", url: "", title: text };
    case "table":
      return { type: "table", title: firstLine, columns: ["Column 1", "Column 2"], rows: [["", ""]] };
    case "people":
      return {
        type: "people",
        people: text ? text.split("\n").filter(Boolean).map((name) => ({ name, role: "", slack: "" })) : [{ name: "", role: "", slack: "" }],
      };
    case "divider":
      return { type: "divider" };
  }
}

export function BlocksEditor({ blocks, onChange }: Props) {
  // Maintain a parallel id list keyed by index. Recreated when length changes.
  const [ids, setIds] = useState<string[]>(() => blocks.map((_, i) => `b-${i}-${Math.random().toString(36).slice(2, 8)}`));

  // Keep ids in sync if external blocks length changes (e.g. add/remove from outside)
  if (ids.length !== blocks.length) {
    setIds(blocks.map((_, i) => ids[i] ?? `b-${i}-${Math.random().toString(36).slice(2, 8)}`));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(i: number, b: ContentBlock) {
    const next = blocks.slice();
    next[i] = b;
    onChange(next);
  }
  function remove(i: number) {
    const nextIds = ids.slice();
    nextIds.splice(i, 1);
    setIds(nextIds);
    onChange(blocks.filter((_, j) => j !== i));
  }
  function add(type: BlockType) {
    setIds([...ids, `b-${blocks.length}-${Math.random().toString(36).slice(2, 8)}`]);
    onChange([...blocks, emptyBlock(type)]);
  }
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setIds(arrayMove(ids, oldIndex, newIndex));
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {blocks.map((b, i) => (
            <SortableBlockCard
              key={ids[i]}
              id={ids[i]}
              block={b}
              onChange={(next) => update(i, next)}
              onRemove={() => remove(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Add block <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
            <DropdownMenuItem key={t} onClick={() => add(t)}>
              {BLOCK_TYPE_LABELS[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortableBlockCard({
  id,
  block,
  onChange,
  onRemove,
}: {
  id: string;
  block: ContentBlock;
  onChange: (b: ContentBlock) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 -ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {BLOCK_TYPE_LABELS[block.type]}
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                  <DropdownMenuItem
                    key={t}
                    disabled={t === block.type}
                    onClick={() => onChange(convertBlock(block, t))}
                  >
                    {BLOCK_TYPE_LABELS[t]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <BlockFields block={block} onChange={onChange} />
        {(block.type === "paragraph" ||
          block.type === "callout" ||
          block.type === "card" ||
          block.type === "two_col" ||
          block.type === "accordion" ||
          block.type === "checklist_preview" ||
          block.type === "table") && (
          <div className="text-[10px] text-muted-foreground mt-2">
            Tip: <code>**bold**</code>, <code>*italic*</code>, <code>[text](url)</code>, <code>`code`</code>
          </div>
        )}
      </Card>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (b: ContentBlock) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <Input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case "paragraph":
      return (
        <Textarea
          rows={4}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case "callout":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={block.label ?? ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              rows={3}
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
            />
          </div>
        </div>
      );
    case "card":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={block.title}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              rows={4}
              value={block.body}
              onChange={(e) => onChange({ ...block, body: e.target.value })}
            />
          </div>
        </div>
      );
    case "two_col":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["left", "right"] as const).map((side) => (
            <div key={side} className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {side}
              </div>
              <Input
                placeholder="Title"
                value={block[side].title}
                onChange={(e) =>
                  onChange({ ...block, [side]: { ...block[side], title: e.target.value } })
                }
              />
              <Textarea
                rows={4}
                placeholder="Body"
                value={block[side].body}
                onChange={(e) =>
                  onChange({ ...block, [side]: { ...block[side], body: e.target.value } })
                }
              />
            </div>
          ))}
        </div>
      );
    case "table":
      return <TableEditor block={block} onChange={onChange} />;
    case "people":
      return <PeopleEditor block={block} onChange={onChange} />;
    case "checklist_preview":
      return <BulletEditor block={block} onChange={onChange} />;
    case "image":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Image URL</Label>
            <Input
              placeholder="https://…"
              value={block.url}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Alt text</Label>
              <Input
                value={block.alt ?? ""}
                onChange={(e) => onChange({ ...block, alt: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Caption (optional)</Label>
              <Input
                value={block.caption ?? ""}
                onChange={(e) => onChange({ ...block, caption: e.target.value })}
              />
            </div>
          </div>
          {block.url && (
            <img
              src={block.url}
              alt={block.alt ?? ""}
              className="max-h-40 rounded border bg-muted mt-1"
            />
          )}
        </div>
      );
    case "embed":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Title (optional)</Label>
            <Input
              value={block.title ?? ""}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">URL (Loom, YouTube, Figma)</Label>
            <Input
              placeholder="https://www.loom.com/share/…"
              value={block.url}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
            />
          </div>
        </div>
      );
    case "link_list":
      return <LinkListEditor block={block} onChange={onChange} />;
    case "divider":
      return (
        <div className="text-xs text-muted-foreground italic">
          Horizontal divider — no content needed.
        </div>
      );
    case "accordion":
      return <AccordionEditor block={block} onChange={onChange} />;
  }
}

function TableEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "table" }>;
  onChange: (b: ContentBlock) => void;
}) {
  function updateColumn(i: number, value: string) {
    const cols = block.columns.slice();
    cols[i] = value;
    onChange({ ...block, columns: cols });
  }
  function addColumn() {
    onChange({
      ...block,
      columns: [...block.columns, `Column ${block.columns.length + 1}`],
      rows: block.rows.map((r) => [...r, ""]),
    });
  }
  function removeColumn(i: number) {
    if (block.columns.length <= 1) return;
    onChange({
      ...block,
      columns: block.columns.filter((_, j) => j !== i),
      rows: block.rows.map((r) => r.filter((_, j) => j !== i)),
    });
  }
  function updateCell(rowI: number, colI: number, value: string) {
    const rows = block.rows.map((r) => r.slice());
    rows[rowI][colI] = value;
    onChange({ ...block, rows });
  }
  function addRow() {
    onChange({ ...block, rows: [...block.rows, block.columns.map(() => "")] });
  }
  function removeRow(i: number) {
    onChange({ ...block, rows: block.rows.filter((_, j) => j !== i) });
  }
  function moveRow(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= block.rows.length) return;
    const rows = block.rows.slice();
    [rows[i], rows[j]] = [rows[j], rows[i]];
    onChange({ ...block, rows });
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Table title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {block.columns.map((c, i) => (
                <th key={i} className="p-1">
                  <div className="flex items-center gap-1">
                    <Input
                      value={c}
                      onChange={(e) => updateColumn(i, e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeColumn(i)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </th>
              ))}
              <th className="p-1 w-10">
                <Button size="sm" variant="ghost" onClick={addColumn}>
                  <Plus className="size-3.5" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {block.columns.map((_, ci) => (
                  <td key={ci} className="p-1 align-top">
                    <Textarea
                      rows={2}
                      value={row[ci] ?? ""}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="text-xs"
                    />
                  </td>
                ))}
                <td className="p-1 align-top">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveRow(ri, -1)}
                      disabled={ri === 0}
                      aria-label="Move row up"
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveRow(ri, 1)}
                      disabled={ri === block.rows.length - 1}
                      aria-label="Move row down"
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRow(ri)}
                      aria-label="Delete row"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="outline" onClick={addRow}>
        <Plus className="size-3.5" /> Add row
      </Button>
    </div>
  );
}

function PeopleEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "people" }>;
  onChange: (b: ContentBlock) => void;
}) {
  function updatePerson(i: number, patch: Partial<{ name: string; role: string; slack: string }>) {
    const people = block.people.slice();
    people[i] = { ...people[i], ...patch };
    onChange({ ...block, people });
  }
  function addPerson() {
    onChange({ ...block, people: [...block.people, { name: "", role: "", slack: "" }] });
  }
  function removePerson(i: number) {
    onChange({ ...block, people: block.people.filter((_, j) => j !== i) });
  }
  return (
    <div className="space-y-3">
      <Input
        placeholder="List title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      {block.people.map((p, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
          <Input
            placeholder="Name"
            value={p.name}
            onChange={(e) => updatePerson(i, { name: e.target.value })}
          />
          <Input
            placeholder="Role"
            value={p.role ?? ""}
            onChange={(e) => updatePerson(i, { role: e.target.value })}
          />
          <Input
            placeholder="@slack-handle"
            value={p.slack ?? ""}
            onChange={(e) => updatePerson(i, { slack: e.target.value })}
          />
          <Button size="sm" variant="ghost" onClick={() => removePerson(i)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addPerson}>
        <Plus className="size-3.5" /> Add person
      </Button>
    </div>
  );
}

function BulletEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "checklist_preview" }>;
  onChange: (b: ContentBlock) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="List title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      {block.items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Textarea
            rows={1}
            value={item}
            onChange={(e) => {
              const items = block.items.slice();
              items[i] = e.target.value;
              onChange({ ...block, items });
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange({ ...block, items: [...block.items, ""] })}
      >
        <Plus className="size-3.5" /> Add item
      </Button>
    </div>
  );
}

function LinkListEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "link_list" }>;
  onChange: (b: ContentBlock) => void;
}) {
  function updateLink(i: number, patch: Partial<{ title: string; description: string; url: string }>) {
    const links = block.links.slice();
    links[i] = { ...links[i], ...patch };
    onChange({ ...block, links });
  }
  return (
    <div className="space-y-3">
      <Input
        placeholder="List title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      {block.links.map((l, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-2 items-start">
          <Input
            placeholder="Title"
            value={l.title}
            onChange={(e) => updateLink(i, { title: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={l.description ?? ""}
            onChange={(e) => updateLink(i, { description: e.target.value })}
          />
          <Input
            placeholder="https://…"
            value={l.url}
            onChange={(e) => updateLink(i, { url: e.target.value })}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...block, links: block.links.filter((_, j) => j !== i) })}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange({ ...block, links: [...block.links, { title: "", description: "", url: "" }] })
        }
      >
        <Plus className="size-3.5" /> Add link
      </Button>
    </div>
  );
}

function AccordionEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "accordion" }>;
  onChange: (b: ContentBlock) => void;
}) {
  function update(i: number, patch: Partial<{ question: string; answer: string }>) {
    const items = block.items.slice();
    items[i] = { ...items[i], ...patch };
    onChange({ ...block, items });
  }
  return (
    <div className="space-y-3">
      <Input
        placeholder="Section title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      {block.items.map((item, i) => (
        <div key={i} className="space-y-2 border-l-2 border-muted pl-3">
          <div className="flex items-start gap-2">
            <Input
              placeholder="Question"
              value={item.question}
              onChange={(e) => update(i, { question: e.target.value })}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <Textarea
            rows={3}
            placeholder="Answer"
            value={item.answer}
            onChange={(e) => update(i, { answer: e.target.value })}
          />
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange({ ...block, items: [...block.items, { question: "", answer: "" }] })
        }
      >
        <Plus className="size-3.5" /> Add Q&A
      </Button>
    </div>
  );
}

// Re-export with id helpers used by drag-and-drop above (not currently used by callers).
export { withIds, stripIds };
