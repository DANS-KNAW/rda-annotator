import type { VocabularyItem } from '@/utils/annotation-helpers'
import VocabularyBadge from '@/components/VocabularyBadge'

interface VocabularyListProps {
  label: string
  items: VocabularyItem[]
}

export default function VocabularyList({ label, items }: VocabularyListProps) {
  return (
    <div>
      <span className="font-medium text-xs text-gray-700">{label}</span>
      {items.length === 0
        ? (
            <div className="mt-2">
              <span className="text-sm text-gray-400 italic">None</span>
            </div>
          )
        : (
            <div className="mt-2 flex flex-wrap gap-2">
              {items.map(item => (
                <VocabularyBadge
                  key={item.id}
                  label={item.label}
                  url={item.url}
                  description={item.description}
                  variant={item.variant}
                />
              ))}
            </div>
          )}
    </div>
  )
}
