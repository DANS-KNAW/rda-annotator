import type { AnnotationSchema } from '@/types/annotation-schema.interface'
import type { ISettings } from '@/types/settings.interface'
import { storage } from '#imports'
import * as React from 'react'
import { useContext, useEffect, useState } from 'react'
import AnnotationFormSchema from '@/assets/schema.json'
import Button from '@/components/Button'
import { Form } from '@/components/form/Form'
import Toggle from '@/components/form/Toggle'
import Modal from '@/components/Model'
import { AuthenticationContext } from '@/context/authentication.context'

interface VocabularySettings {
  [key: string]: boolean
}

export default function Settings() {
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<VocabularySettings>({})
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const { logout } = useContext(AuthenticationContext)

  const comboboxes = (AnnotationFormSchema as AnnotationSchema).fields.filter(
    (field) => {
      if (field.type !== 'combobox' || !field.vocabulary) {
        return false
      }
      // Exclude languages and resource_types from settings (they are always shown)
      const namespace = field.vocabularyOptions?.namespace
      return namespace !== 'iso-639' && namespace !== 'rda_resource_types'
    },
  )

  const initializeSettings = async () => {
    try {
      const existingSettings = await storage.getItem<ISettings>(
        'local:settings',
      )

      const updatedSettings: VocabularySettings = {}

      comboboxes.forEach((field) => {
        updatedSettings[field.name]
          = existingSettings?.vocabularies?.[field.name] ?? true
      })

      await storage.setItem('local:settings', {
        vocabularies: updatedSettings,
      })

      setSettings(updatedSettings)
      setIsLoading(false)
    }
    catch (error) {
      console.error('Failed to initialize settings:', error)
      setIsLoading(false)
    }
  }

  // Run once on mount to initialize settings
  useEffect(() => {
    initializeSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only on mount
  }, [])

  const onSubmit = async (data: Record<string, boolean>) => {
    try {
      const newSettings: VocabularySettings = {}
      comboboxes.forEach((field) => {
        newSettings[field.name] = data[field.name] === true
      })
      await storage.setItem('local:settings', {
        vocabularies: newSettings,
      })
      setSettings(newSettings)
    }
    catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  if (isLoading) {
    return <div className="mx-2 mt-4">Loading settings...</div>
  }

  return (
    <>
      <Form onSubmit={onSubmit}>
        <div className="mx-2">
          <h2 className="text-base/7 font-semibold mt-4 text-gray-900">
            Vocabularies
          </h2>
          <p className="mt-1 text-sm/6 text-gray-600">
            Choose which vocabularies are active. Only the enabled ones will be
            available and visible when creating annotations.
          </p>
          <div className="mt-8 space-y-4">
            {comboboxes.map(field => (
              <React.Fragment key={field.name}>
                {field.info && (
                  <Modal
                    title={field.label}
                    open={activeModal === field.name}
                    setOpen={() => setActiveModal(null)}
                  >
                    <div className="text-sm mb-8 relative">
                      <div className="sticky -top-2 z-10 bg-white pb-2 pt-4">
                        <div className="text-base flex justify-between items-center">
                          <span className="font-semibold">{field.label}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-label="Close"
                            className="size-6 hover:text-rda-500 cursor-pointer"
                            onClick={() => setActiveModal(null)}
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
                        // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- info comes from trusted schema
                        dangerouslySetInnerHTML={{ __html: field.info || '' }}
                      />
                    </div>
                  </Modal>
                )}
                <div className="flex items-center gap-1" key={field.name}>
                  <button
                    className="hover:text-rda-500 cursor-pointer shrink-0"
                    type="button"
                    title="More info"
                    onClick={() => setActiveModal(field.name)}
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
                  <div className="flex-1">
                    <Toggle
                      name={field.name}
                      label={field.label}
                      defaultChecked={settings[field.name]}
                    />
                  </div>
                </div>
              </React.Fragment>
            ))}
            <button
              className="mt-4 rounded-md bg-rda-500 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-rda-400 focus-visible:outline-2 cursor-pointer focus-visible:outline-offset-2 focus-visible:outline-rda-500 w-full flex justify-center"
              type="submit"
            >
              Save Settings
            </button>
          </div>
        </div>
      </Form>

      <div className="mx-2 mb-8 pt-4 mt-4 border-t border-gray-200">
        <h2 className="text-base/7 font-semibold mt-4 text-gray-900 mb-4">
          Account Settings
        </h2>

        <Button
          onClick={logout}
          label="Logout"
          className="flex w-full justify-center bg-red-500 hover:bg-red-400"
        />
      </div>
    </>
  )
}
