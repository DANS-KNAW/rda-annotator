import type { UseFormRegister } from 'react-hook-form'
import Modal from '@/components/Model'

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  register?: UseFormRegister<any>
  info?: string
  rows?: number
  label: string | React.ReactNode
  name: string
}

export function Textarea({
  register,
  name,
  label,
  info,
  rows,
  ...rest
}: InputProps) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div>
      {info && (
        <Modal title={label} open={showInfo} setOpen={() => setShowInfo(false)}>
          <div className="text-sm mb-8 relative">
            <div className="sticky -top-2 z-10 bg-white pb-2 pt-4">
              <div className="text-base flex justify-between items-center">
                <span className="font-semibold">{label}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-label="Close"
                  className="size-6 hover:text-rda-500 cursor-pointer"
                  onClick={() => setShowInfo(false)}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <div
              className="mt-4 prose prose-a:underline prose-a:text-rda-500"
              dangerouslySetInnerHTML={{ __html: info || '' }}
            />
          </div>
        </Modal>
      )}
      <div className="flex items-center justify-between">
        <label
          htmlFor={`${name}-input`}
          className="block text-sm/6 font-medium text-gray-900"
        >
          {label}
          {' '}
          {rest.required && <span className="text-red-500">*</span>}
        </label>
        {info && (
          <button
            className="hover:text-rda-500 cursor-pointer"
            type="button"
            title="More info"
            onClick={() => setShowInfo(!showInfo)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-2">
        <textarea
          id={`${name}-textarea`}
          rows={rows || 4}
          className="block w-full rounded-md bg-white px-3 py-1.5 text-gray-900 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-rda-500 text-sm/6 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          {...(register ? register(name) : {})}
          {...rest}
        />
      </div>
    </div>
  )
}
