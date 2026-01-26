import * as React from 'react'

interface AlertProps {
  title: string
  messages: (string | React.ReactNode)[]
}

export default function Alert({ title, messages }: AlertProps) {
  return (
    <div role="alert" className="rounded-md bg-red-50 p-4 mx-2 border border-red-400 my-4">
      <div className="flex">
        <div className="shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
            className="size-5 text-red-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <ul role="list" className="list-disc space-y-1 pl-5">
              {messages.map((message, index) => (
                // eslint-disable-next-line react/no-array-index-key -- static list, no reordering
                <li key={index}>{message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
