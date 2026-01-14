type XOR<T, U>
  = | (T & { [K in keyof U]?: never })
    | (U & { [K in keyof T]?: never })

interface Common {
  label: string
  className?: string
}

interface ClickProps { onClick: () => void }
interface LinkProps { href: string, newTab?: boolean }

export type ButtonProps = Common & XOR<ClickProps, LinkProps>

export default function Button({
  label,
  className,
  onClick,
  href,
  newTab,
}: ButtonProps) {
  const base
    = 'rounded-md bg-rda-500 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-rda-400 focus-visible:outline-2 cursor-pointer focus-visible:outline-offset-2 focus-visible:outline-rda-500'

  if (href) {
    return (
      <a
        href={href}
        className={`${base} ${className}`}
        target={newTab ? '_blank' : '_self'}
      >
        {label}
      </a>
    )
  }

  return (
    <button type="button" className={`${base} ${className}`} onClick={onClick}>
      {label}
    </button>
  )
}
