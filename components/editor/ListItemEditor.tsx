"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { useMemo, useState } from "react";

interface ListItem {
  [key: string]: unknown;
}

interface ListItemEditorProps {
  items: ListItem[];
  fieldLabel: string;
  fieldDescription?: string;
  onChange: (items: ListItem[]) => void;
  isPending?: boolean;
}

// Common field patterns for smart field type detection
const FIELD_TYPE_PATTERNS: Record<string, "text" | "longtext" | "date" | "time" | "url" | "email"> = {
  // Date fields
  date: "date",
  datum: "date",
  startDate: "date",
  endDate: "date",
  // Time fields
  time: "time",
  tijd: "time",
  startTime: "time",
  endTime: "time",
  // URL fields
  url: "url",
  link: "url",
  href: "url",
  website: "url",
  // Email fields
  email: "email",
  mail: "email",
  // Long text fields
  description: "longtext",
  beschrijving: "longtext",
  content: "longtext",
  text: "longtext",
  tekst: "longtext",
  body: "longtext",
  notes: "longtext",
  opmerkingen: "longtext",
  answer: "longtext",
  antwoord: "longtext",
};

function inferFieldType(key: string, value: unknown): "text" | "longtext" | "date" | "time" | "url" | "email" {
  const lowerKey = key.toLowerCase();
  
  // Check exact matches first
  if (FIELD_TYPE_PATTERNS[lowerKey]) {
    return FIELD_TYPE_PATTERNS[lowerKey];
  }
  
  // Check if key contains known patterns
  for (const [pattern, type] of Object.entries(FIELD_TYPE_PATTERNS)) {
    if (lowerKey.includes(pattern.toLowerCase())) {
      return type;
    }
  }
  
  // Infer from value length if string
  if (typeof value === "string" && value.length > 100) {
    return "longtext";
  }
  
  return "text";
}

function getFieldLabel(key: string): string {
  // Convert camelCase/snake_case to human-readable
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function getItemSummary(item: ListItem): string {
  // Try to find a good summary field
  const summaryFields = ["title", "naam", "name", "heading", "label", "question", "vraag", "date", "datum"];
  
  for (const field of summaryFields) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) {
      return value.length > 50 ? value.substring(0, 50) + "..." : value;
    }
  }
  
  // Fallback: first string value
  for (const value of Object.values(item)) {
    if (typeof value === "string" && value.trim()) {
      return value.length > 50 ? value.substring(0, 50) + "..." : value;
    }
  }
  
  return "Item";
}

function getItemFields(items: ListItem[]): string[] {
  // Collect all unique field keys from all items
  const fields = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item)) {
      fields.add(key);
    }
  }
  return Array.from(fields);
}

function createEmptyItem(template: ListItem | undefined): ListItem {
  if (!template) {
    return { title: "", description: "" };
  }
  
  const newItem: ListItem = {};
  for (const key of Object.keys(template)) {
    newItem[key] = "";
  }
  return newItem;
}

/**
 * ListItemEditor - A user-friendly editor for list/array fields
 * 
 * Features:
 * - Expandable cards for each item
 * - Smart field type detection (date, time, url, longtext, etc.)
 * - Add/remove items
 * - Move items up/down
 * - Visual item summary when collapsed
 */
export function ListItemEditor({
  items,
  fieldLabel,
  fieldDescription,
  onChange,
  isPending = false,
}: ListItemEditorProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Ensure items is an array
  const itemsArray = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (typeof items === "object" && items !== null) {
      return Object.values(items) as ListItem[];
    }
    return [];
  }, [items]);

  const allFields = useMemo(() => getItemFields(itemsArray), [itemsArray]);

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleItemFieldChange = (index: number, key: string, value: string) => {
    const updated = [...itemsArray];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  const handleAddItem = () => {
    const template = itemsArray[0];
    const newItem = createEmptyItem(template);
    const newIndex = itemsArray.length;
    onChange([...itemsArray, newItem]);
    setExpandedItems((prev) => new Set(prev).add(newIndex));
    setEditingItemIndex(newIndex);
  };

  const handleRemoveItem = (index: number) => {
    const updated = itemsArray.filter((_, i) => i !== index);
    onChange(updated);
    setExpandedItems((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= itemsArray.length) return;
    
    const updated = [...itemsArray];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
    
    setExpandedItems((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i === index) next.add(newIndex);
        else if (i === newIndex) next.add(index);
        else next.add(i);
      }
      return next;
    });
  };

  const inputClasses =
    "w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50";

  const renderFieldInput = (item: ListItem, index: number, key: string) => {
    const value = item[key];
    const stringValue = typeof value === "string" ? value : value != null ? String(value) : "";
    const fieldType = inferFieldType(key, value);
    const label = getFieldLabel(key);

    if (fieldType === "longtext") {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-[10px] font-medium text-slate-600">{label}</Label>
          <Textarea
            value={stringValue}
            onChange={(e) => handleItemFieldChange(index, key, e.target.value)}
            className={`${inputClasses} min-h-[60px] resize-y`}
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        </div>
      );
    }

    const inputType = fieldType === "date" ? "date" 
      : fieldType === "time" ? "time"
      : fieldType === "url" ? "url"
      : fieldType === "email" ? "email"
      : "text";

    return (
      <div key={key} className="space-y-1">
        <Label className="text-[10px] font-medium text-slate-600">{label}</Label>
        <Input
          type={inputType}
          value={stringValue}
          onChange={(e) => handleItemFieldChange(index, key, e.target.value)}
          className={inputClasses}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>
    );
  };

  if (itemsArray.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium text-slate-700">{fieldLabel}</Label>
          {isPending && (
            <span className="text-[9px] font-semibold text-amber-600">modified</span>
          )}
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center">
          <p className="text-xs text-slate-500 mb-2">No items yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="text-xs"
          >
            <span className="mr-1">➕</span> Add first item
          </Button>
        </div>
        {fieldDescription && (
          <p className="text-[9px] text-slate-500">{fieldDescription}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] font-medium text-slate-700">{fieldLabel}</Label>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
            {itemsArray.length} {itemsArray.length === 1 ? "item" : "items"}
          </span>
        </div>
        {isPending && (
          <span className="text-[9px] font-semibold text-amber-600">modified</span>
        )}
      </div>

      <div className="space-y-1.5">
        {itemsArray.map((item, index) => {
          const isExpanded = expandedItems.has(index);
          const summary = getItemSummary(item);
          const itemFields = Object.keys(item);

          return (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-white/60 overflow-hidden"
            >
              {/* Item Header */}
              <div
                className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50/50 cursor-pointer hover:bg-slate-50"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[9px] text-slate-400 font-mono">
                    #{index + 1}
                  </span>
                  <span className="text-[10px] text-slate-700 truncate">
                    {summary}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Move buttons */}
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveItem(index, "up");
                    }}
                    disabled={index === 0}
                    className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveItem(index, "down");
                    }}
                    disabled={index === itemsArray.length - 1}
                    className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(index);
                    }}
                    className="h-5 w-5 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Delete item"
                  >
                    🗑️
                  </Button>
                  {/* Expand indicator */}
                  <span className="text-[9px] text-slate-400 ml-1">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {/* Item Content - Expanded */}
              {isExpanded && (
                <div className="px-2.5 py-2 space-y-2 border-t border-slate-100">
                  {itemFields.map((key) => renderFieldInput(item, index, key))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Item Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddItem}
        className="w-full text-xs border-dashed"
      >
        <span className="mr-1">➕</span> Add item
      </Button>

      {fieldDescription && (
        <p className="text-[9px] text-slate-500">{fieldDescription}</p>
      )}
    </div>
  );
}
