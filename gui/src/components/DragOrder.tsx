'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const blocks = [
  { id: 'track', labelZh: '曲序号', labelEn: 'Track #' },
  { id: 'title', labelZh: '歌曲名', labelEn: 'Title' },
  { id: 'artist', labelZh: '歌手名', labelEn: 'Artist' },
  { id: 'album', labelZh: '专辑名', labelEn: 'Album' },
  { id: 'sep', labelZh: ' — ', labelEn: ' — ', isSep: true },
];

function SortableBlock({ id, label, isSep }: { id: string; label: string; isSep?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg select-none cursor-grab active:cursor-grabbing ${
        isSep
          ? 'bg-zinc-800 text-zinc-400 text-lg font-bold w-10 justify-center'
          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      }`}
      {...attributes}
      {...listeners}
    >
      {!isSep && <GripVertical className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />}
      <span className="text-sm whitespace-nowrap">{label}</span>
    </div>
  );
}

interface DragOrderProps {
  value: string[];
  onChange: (order: string[]) => void;
}

export default function DragOrder({ value, onChange }: DragOrderProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = value.indexOf(active.id as string);
        const newIndex = value.indexOf(over.id as string);
        onChange(arrayMove(value, oldIndex, newIndex));
      }
    },
    [value, onChange]
  );

  const labels = blocks.map((b) => ({
    id: b.id,
    label: b.labelZh,
    isSep: b.isSep,
  }));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={value} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-wrap gap-2 p-3 bg-zinc-800/50 rounded-lg min-h-[48px] items-center">
          {value.map((id) => {
            const block = labels.find((b) => b.id === id);
            return block ? (
              <SortableBlock key={id} id={id} label={block.label} isSep={block.isSep} />
            ) : null;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function orderToTemplate(order: string[]): string {
  const parts: string[] = [];
  for (const id of order) {
    if (id === 'track') parts.push('{track:02d}');
    else if (id === 'title') parts.push('{title}');
    else if (id === 'artist') parts.push('{artist}');
    else if (id === 'album') parts.push('{album}');
    else if (id === 'sep') parts.push(' - ');
  }
  return parts.join(' ').replace(/\s*-\s*/g, ' - ');
}

export const defaultOrder = ['track', 'title', 'artist'];
