import type { ReactNode } from 'react'

interface FieldDisplayProps {
  label: string
  value: string | ReactNode | null | undefined
  variant?: 'text' | 'quote'
}

export default function FieldDisplay({
  label,
  value,
  variant = 'text',
}: FieldDisplayProps) {
  // Return null only for fragment when empty (special case)
  if (!value && variant === 'quote') {
    return null
  }

  if (variant === 'quote') {
    return (
      <div>
        <span className="font-medium text-xs text-gray-700">{label}</span>
        <blockquote className="mt-2 border-l-4 border-rda-500 pl-4 italic text-gray-700 text-sm">
          "
          {value}
          "
        </blockquote>
      </div>
    )
  }

  // Show empty state for text fields when no value
  if (!value) {
    return (
      <div>
        <span className="font-medium text-xs text-gray-700">{label}</span>
        <p className="mt-2 text-sm text-gray-400 italic">None</p>
      </div>
    )
  }

  // If value is a React node (not a string), render it directly
  if (typeof value !== 'string') {
    return (
      <div>
        <span className="font-medium text-xs text-gray-700">{label}</span>
        <div className="mt-2">{value}</div>
      </div>
    )
  }

  return (
    <div>
      <span className="font-medium text-xs text-gray-700">{label}</span>
      <p className="mt-2 text-sm bg-gray-50 border border-gray-200 p-2 rounded-md text-gray-900">
        {value}
      </p>
    </div>
  )
}
