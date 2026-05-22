'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MIN_SLIDES, MAX_SLIDES } from '@/lib/carousel-slide-ops';

interface FilmstripSlide {
  slideNumber: number;
  publicUrl?: string;
  template?: string;
}

interface CarouselFilmstripProps {
  slides: FilmstripSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onInsert: (index: number) => void;
  onDelete: (index: number) => void;
}

/** cover / body / last label from a slide's position. */
function roleLabel(index: number, total: number): string {
  if (index === 0) return 'Cover';
  if (index === total - 1) return 'Last';
  return 'Body';
}

function Thumb({
  slide,
  index,
  total,
  active,
  onSelect,
  onDelete,
}: {
  slide: FilmstripSlide;
  index: number;
  total: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.slideNumber });
  const canDelete = total > MIN_SLIDES;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative shrink-0 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        onClick={onSelect}
        {...attributes}
        {...listeners}
        className={`block w-[64px] h-[80px] rounded-md overflow-hidden border-2 ${
          active ? 'border-accent' : 'border-transparent'
        }`}
        aria-label={`Slide ${slide.slideNumber}`}
      >
        {slide.publicUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.publicUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-secondary flex items-center justify-center text-[9px] text-text-secondary">
            new
          </div>
        )}
      </button>
      <span className="absolute top-0 left-0 px-1 text-[8px] bg-black/55 text-white rounded-br">
        {slide.slideNumber} · {roleLabel(index, total)}
      </span>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-0 right-0 hidden group-hover:block bg-black/55 text-white text-[10px] px-1 rounded-bl"
          aria-label={`Delete slide ${slide.slideNumber}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-4 h-[80px] text-accent text-sm opacity-40 hover:opacity-100"
      aria-label="Insert slide here"
    >
      +
    </button>
  );
}

export default function CarouselFilmstrip({
  slides,
  activeIndex,
  onSelect,
  onReorder,
  onInsert,
  onDelete,
}: CarouselFilmstripProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const total = slides.length;
  const canAdd = total < MAX_SLIDES;

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.slideNumber === active.id);
    const to = slides.findIndex((s) => s.slideNumber === over.id);
    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={slides.map((s) => s.slideNumber)}
          strategy={horizontalListSortingStrategy}
        >
          {slides.map((slide, index) => (
            <div key={slide.slideNumber} className="flex items-center">
              {canAdd && <InsertButton onClick={() => onInsert(index)} />}
              <Thumb
                slide={slide}
                index={index}
                total={total}
                active={index === activeIndex}
                onSelect={() => onSelect(index)}
                onDelete={() => onDelete(index)}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>
      {canAdd && (
        <button
          type="button"
          onClick={() => onInsert(total)}
          className="shrink-0 w-[64px] h-[80px] rounded-md border border-dashed border-text-secondary text-text-secondary text-lg"
          aria-label="Add slide at end"
        >
          +
        </button>
      )}
    </div>
  );
}
