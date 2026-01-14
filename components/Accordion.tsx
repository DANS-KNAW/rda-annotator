import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'

interface AccordionProps {
  question: string
  answer: string | React.ReactNode
}

export default function Accordion({ question, answer }: AccordionProps) {
  return (
    <Disclosure as="div" className="py-4 first:pt-0 last:pb-0">
      <dt>
        <DisclosureButton className="group flex w-full items-center justify-between text-left text-gray-900">
          <span className="text-sm">{question}</span>
          <span className="ml-6 flex h-7 items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              className="size-5 group-data-open:hidden"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              className="size-6 group-not-data-open:hidden"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          </span>
        </DisclosureButton>
      </dt>
      <DisclosurePanel as="dd" className="mt-2">
        <div className="text-sm/6 text-gray-600">{answer}</div>
      </DisclosurePanel>
    </Disclosure>
  )
}
