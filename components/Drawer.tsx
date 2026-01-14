import { useEffect, useState } from 'react'

interface DrawerProps {
  title: string | React.ReactNode
  children: React.ReactNode
  open: boolean
  setOpen: (value: boolean) => void
}

export default function Drawer({ title, children, open, setOpen }: DrawerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  /* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect -- Animation state management: state updates are intentional for smooth open/close transitions */
  useEffect(() => {
    if (open) {
      // Opening: first make visible, then animate in
      setIsVisible(true)
      setIsAnimating(true)
      // Small delay to ensure the initial state is rendered before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(false)
        })
      })
    }
    else {
      // Closing: first animate out, then hide
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
      }, 300) // Match transition duration
      return () => clearTimeout(timer)
    }
  }, [open])
  /* eslint-enable react-hooks-extra/no-direct-set-state-in-use-effect */

  if (!isVisible && !open) {
    return null
  }

  return (
    <div className="absolute inset-0 z-30 font-roboto">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-gray-500/75 transition-opacity duration-300 ease-in-out ${
          !isAnimating && open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 flex w-full">
            <div
              className={`w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
                !isAnimating && open ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex h-full flex-col overflow-y-auto">
                <h3 className="sr-only">{title}</h3>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
