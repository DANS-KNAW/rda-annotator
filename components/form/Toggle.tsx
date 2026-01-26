import type { UseFormRegister } from 'react-hook-form'

interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: string
  label: string | React.ReactNode
  register?: UseFormRegister<any>
}

export default function Toggle({
  name,
  label,
  register,
  ...rest
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm cursor-pointer">
        <label className="cursor-pointer" htmlFor={`${name}-input`}>
          {label}
        </label>
      </div>
      <div className="group relative flex w-11 shrink-0 rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-rda-500 transition-colors duration-200 ease-in-out has-checked:bg-rda-500 has-focus-visible:outline-2">
        <input
          type="checkbox"
          id={`${name}-input`}
          className="absolute inset-0 w-full h-full opacity-0 appearance-none focus:outline-hidden cursor-pointer z-10"
          data-testid={`toggle-${name}`}
          {...(register ? register(name) : {})}
          {...rest}
        />
        <span className="relative size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5 pointer-events-none">
          <span
            aria-hidden="true"
            className="absolute inset-0 flex size-full items-center justify-center opacity-100 transition-opacity duration-200 ease-in group-has-checked:opacity-0 group-has-checked:duration-100 group-has-checked:ease-out"
          >
            <svg
              fill="none"
              viewBox="0 0 12 12"
              className="size-3 text-gray-400"
            >
              <path
                d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-0 flex size-full items-center justify-center opacity-0 transition-opacity duration-100 ease-out group-has-checked:opacity-100 group-has-checked:duration-200 group-has-checked:ease-in"
          >
            <svg
              fill="currentColor"
              viewBox="0 0 12 12"
              className="size-3 text-rda-500"
            >
              <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
            </svg>
          </span>
        </span>
      </div>
    </div>
  )
}
