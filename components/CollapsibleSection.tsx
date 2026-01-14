import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'

interface CollapsibleSectionProps {
  title: string
  isEmpty: boolean
  defaultOpen?: boolean
  itemCount?: number
  children: React.ReactNode
}

export default function CollapsibleSection({
  title,
  isEmpty,
  defaultOpen = false,
  itemCount,
  children,
}: CollapsibleSectionProps) {
  const initialState = isEmpty ? false : defaultOpen

  return (
    <Disclosure as="div" defaultOpen={initialState}>
      {({ open }) => (
        <>
          <DisclosureButton className="w-full border-b border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`size-5 text-gray-400 transition-transform duration-200 ${
                    open ? 'rotate-90' : ''
                  }`}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                {itemCount !== undefined && itemCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-rda-100 px-2 py-0.5 text-xs font-medium text-rda-700">
                    {itemCount}
                  </span>
                )}
              </div>
              {isEmpty && (
                <span className="text-xs text-gray-500 italic">Empty</span>
              )}
            </div>
          </DisclosureButton>
          <DisclosurePanel className="px-4 py-4 space-y-4">
            {children}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
