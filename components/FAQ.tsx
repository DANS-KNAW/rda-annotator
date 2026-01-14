import Accordion from './Accordion'

const faqs = [
  {
    question: 'Where can I find my annotations?',
    answer: (
      <>
        Your annotations will currently be deposited in the RDA Graph, and are
        available from the
        {' '}
        <a
          className="text-rda-500 underline"
          target="_blank"
          href="https://www.rd-alliance.org"
        >
          RDA Discovery application
        </a>
      </>
    ),
  },
  {
    question: 'How can I create an annotation?',
    answer:
      'Select any text on the page; a widget appears next to the selection. Click Annotate, fill in the metadata form, and Save.',
  },
]

export default function FAQ() {
  return (
    <div className="px-2 py-8">
      <h2 className="text-xl font-semibold tracking-tight text-gray-900">
        Frequently asked questions
      </h2>
      <dl className="mt-6 divide-y divide-gray-900/10">
        {faqs.map(faq => (
          <Accordion
            key={faq.question}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </dl>
    </div>
  )
}
