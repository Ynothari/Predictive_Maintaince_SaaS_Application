/**
 * Drag-and-drop dashboard card ordering using @dnd-kit.
 * Cards can be reordered and the layout is persisted to localStorage.
 */
import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export interface DashboardCard {
  id: string
  label: string
  visible: boolean
}

const DEFAULT_CARDS: DashboardCard[] = [
  { id: 'total_analyses', label: 'Total Analyses',  visible: true },
  { id: 'last_analysis',  label: 'Last Analysis',   visible: true },
  { id: 'total_failures', label: 'Total Failures',  visible: true },
  { id: 'model_accuracy', label: 'Model Accuracy',  visible: true },
]

const STORAGE_KEY = 'dashboard_card_order'

export function useDashboardCards() {
  const [cards, setCards] = useState<DashboardCard[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: DashboardCard[] = JSON.parse(stored)
        // Merge with defaults to handle new cards
        const ids = new Set(parsed.map(c => c.id))
        const merged = [...parsed, ...DEFAULT_CARDS.filter(c => !ids.has(c.id))]
        return merged
      }
    } catch {}
    return DEFAULT_CARDS
  })

  const reorder = useCallback((newOrder: DashboardCard[]) => {
    setCards(newOrder)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder))
  }, [])

  const toggleCard = useCallback((id: string) => {
    setCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const resetLayout = useCallback(() => {
    setCards(DEFAULT_CARDS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { cards, reorder, toggleCard, resetLayout }
}

interface SortableCardProps {
  card: DashboardCard
  children: React.ReactNode
}

export function SortableCard({ card, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      {children}
    </div>
  )
}

interface DraggableDashboardProps {
  cards: DashboardCard[]
  onReorder: (cards: DashboardCard[]) => void
  children: (card: DashboardCard) => React.ReactNode
}

export function DraggableDashboard({ cards, onReorder, children }: DraggableDashboardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(c => c.id === active.id)
      const newIndex = cards.findIndex(c => c.id === over.id)
      onReorder(arrayMove(cards, oldIndex, newIndex))
    }
  }

  const visibleCards = cards.filter(c => c.visible)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleCards.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {visibleCards.map(card => (
            <SortableCard key={card.id} card={card}>
              {children(card)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
