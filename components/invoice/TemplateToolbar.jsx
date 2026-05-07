'use client';

import { useState } from 'react';
import {
  MousePointer2, Brush, Pen, Eraser, Undo2, Redo2, Trash2,
  Type, Palette, Minus, Plus,
} from 'lucide-react';

const TOOLS = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'text', label: 'Text Box', icon: Type },
  { id: 'brush', label: 'Brush', icon: Brush },
  { id: 'pen', label: 'Pen', icon: Pen },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
];

const COLORS = [
  '#0B1435', '#2A63E2', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#FFFFFF', '#64748B',
];

export default function TemplateToolbar({
  activeTool, setActiveTool,
  brushColor, setBrushColor,
  brushSize, setBrushSize,
  penColor, setPenColor,
  penSize, setPenSize,
  onUndo, onRedo, canUndo, canRedo,
  onClear,
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isBrush = activeTool === 'brush' || activeTool === 'pen';

  const currentColor = activeTool === 'brush' ? brushColor : activeTool === 'pen' ? penColor : brushColor;
  const currentSize = activeTool === 'brush' ? brushSize : activeTool === 'pen' ? penSize : brushSize;
  const setCurrentColor = activeTool === 'brush' ? setBrushColor : activeTool === 'pen' ? setPenColor : setBrushColor;
  const setCurrentSize = activeTool === 'brush' ? setBrushSize : activeTool === 'pen' ? setPenSize : setBrushSize;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-bg-elevated p-3 shadow-md">
      {/* Tool row */}
      <div className="flex gap-1">
        {TOOLS.map((t) => {
          const I = t.icon;
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              title={t.label}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                active
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-bg-muted text-fg-muted hover:bg-bg-subtle hover:text-fg'
              }`}
            >
              <I className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Brush / Pen settings */}
      {isBrush && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg-muted">Size</span>
            <span className="text-xs tabular-nums text-fg">{currentSize}px</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSize(Math.max(1, currentSize - 1))}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-muted text-fg-muted hover:bg-bg-subtle"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="range"
              min={1}
              max={20}
              value={currentSize}
              onChange={(e) => setCurrentSize(+e.target.value)}
              className="h-1.5 flex-1 appearance-none rounded-full bg-bg-muted accent-brand"
            />
            <button
              onClick={() => setCurrentSize(Math.min(20, currentSize + 1))}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-muted text-fg-muted hover:bg-bg-subtle"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg-muted">Color</span>
            <div
              className="h-4 w-4 rounded-full border border-border"
              style={{ background: currentColor }}
            />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                  currentColor === c ? 'border-fg ring-1 ring-brand' : 'border-border'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="flex h-8 flex-1 items-center justify-center rounded-lg bg-bg-muted text-fg-muted transition hover:bg-bg-subtle disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className="flex h-8 flex-1 items-center justify-center rounded-lg bg-bg-muted text-fg-muted transition hover:bg-bg-subtle disabled:opacity-40"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClear}
          title="Clear strokes"
          className="flex h-8 flex-1 items-center justify-center rounded-lg bg-dangerSoft text-danger transition hover:bg-danger/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
