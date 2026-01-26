/**
 * Form interaction helpers for E2E tests.
 * Provides utilities for filling HeadlessUI comboboxes and form fields.
 *
 * IMPORTANT: Uses label-based selection, NOT index-based, because some
 * combobox fields can be conditionally hidden based on user settings.
 */

import type { Frame, Page } from '@playwright/test'

/**
 * Mapping of field names to their display labels in the form.
 * Labels must match exactly what appears in the UI.
 */
const FIELD_LABELS: Record<string, string> = {
  language: 'Language',
  resource_type: 'Resource Type',
  keywords: 'Keywords/Tags',
  pathways: 'RDA Pathways',
  gorc_elements: 'GORC Elements',
  gorc_attributes: 'GORC Attributes',
  interest_groups: 'Interest Groups',
  working_groups: 'Working Groups',
  disciplines: 'Disciplines (Domains)',
  momsi: 'MOMSI',
}

export type ComboboxFieldName = keyof typeof FIELD_LABELS

export interface ComboboxSelection {
  /** Text to type to filter options */
  searchText?: string
  /** Select option by visible label */
  selectByLabel?: string
  /** Select option by index (0-based) */
  selectByIndex?: number
}

export interface FormData {
  title: string
  description?: string
  notes?: string
  language?: ComboboxSelection
  resource_type?: ComboboxSelection
  keywords?: ComboboxSelection[]
  pathways?: ComboboxSelection[]
  gorc_elements?: ComboboxSelection[]
  gorc_attributes?: ComboboxSelection[]
  interest_groups?: ComboboxSelection[]
  working_groups?: ComboboxSelection[]
  disciplines?: ComboboxSelection[]
  momsi?: ComboboxSelection[]
}

/**
 * Map from FIELD_LABELS keys to the actual form field names used in data-testid.
 * These must match the `name` prop passed to TypeaheadInput in Create.tsx.
 */
const FIELD_NAMES: Record<string, string> = {
  language: 'language',
  resource_type: 'resource_type',
  keywords: 'keywords',
  pathways: 'pathways',
  gorc_elements: 'gorc_elements',
  gorc_attributes: 'gorc_attributes',
  interest_groups: 'interest_groups',
  working_groups: 'working_groups',
  disciplines: 'disciplines',
  momsi: 'momsi',
}

/**
 * Find a combobox by its field name using data-testid attributes.
 * Uses Playwright's getByTestId() for reliable element location.
 *
 * The TypeaheadInput component has these test IDs:
 * - data-testid="combobox-{name}" on the Combobox container
 * - data-testid="combobox-input-{name}" on the ComboboxInput
 * - data-testid="combobox-button-{name}" on the ComboboxButton
 * - data-testid="combobox-options-{name}" on the ComboboxOptions
 */
async function findComboboxByLabel(sidebarFrame: Frame, fieldName: string) {
  const label = FIELD_LABELS[fieldName]
  if (!label) {
    throw new Error(`Unknown combobox field: ${fieldName}`)
  }

  const name = FIELD_NAMES[fieldName]
  if (!name) {
    throw new Error(`Unknown field name mapping for: ${fieldName}`)
  }

  return {
    container: sidebarFrame.getByTestId(`combobox-${name}`),
    button: sidebarFrame.getByTestId(`combobox-button-${name}`),
    input: sidebarFrame.getByTestId(`combobox-input-${name}`),
    options: sidebarFrame.getByTestId(`combobox-options-${name}`),
  }
}

/**
 * Fill a single HeadlessUI combobox in the sidebar iframe.
 * Uses label-based selection for reliability.
 */
export async function fillCombobox(
  sidebarFrame: Frame,
  page: Page,
  fieldName: string,
  selection: ComboboxSelection,
): Promise<void> {
  const label = FIELD_LABELS[fieldName]
  if (!label) {
    throw new Error(`Unknown combobox field: ${fieldName}`)
  }

  // Close any open dropdowns first by pressing Escape
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // Find the combobox by its label - this is the key difference from index-based
  const combobox = await findComboboxByLabel(sidebarFrame, fieldName)

  // Scroll the combobox into view
  await combobox.button.scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)

  // Click the button to open dropdown
  await combobox.button.click({ force: true })
  await page.waitForTimeout(500) // Wait for dropdown animation and data load

  // Wait for options to be visible (API response)
  try {
    await combobox.options.waitFor({ state: 'visible', timeout: 5000 })
  }
  catch {
    // Options might not be visible if API returns empty or error
    console.warn(`Combobox dropdown for ${fieldName} not visible, skipping selection`)
    await page.keyboard.press('Escape')
    return
  }

  // If search text provided, type to filter
  if (selection.searchText) {
    await combobox.input.fill(selection.searchText)
    await page.waitForTimeout(400) // Wait for debounced search
  }

  // Select by label
  if (selection.selectByLabel) {
    const option = combobox.options
      .locator('[id*="headlessui-combobox-option"]')
      .filter({ hasText: selection.selectByLabel })
      .first()

    const isVisible = await option.isVisible().catch(() => false)
    if (isVisible) {
      await option.click()
    }
    else {
      console.warn(`Option "${selection.selectByLabel}" not found in ${fieldName} dropdown`)
      // Close dropdown without selection
      await page.keyboard.press('Escape')
    }
  }
  // Select by index
  else if (selection.selectByIndex !== undefined) {
    const options = combobox.options.locator('[id*="headlessui-combobox-option"]')
    const count = await options.count()

    if (selection.selectByIndex < count) {
      await options.nth(selection.selectByIndex).click()
    }
    else {
      console.warn(`Index ${selection.selectByIndex} out of bounds (${count} options) in ${fieldName}`)
      await page.keyboard.press('Escape')
    }
  }
  // Default: select first option
  else {
    const firstOption = combobox.options.locator('[id*="headlessui-combobox-option"]').first()
    const isVisible = await firstOption.isVisible().catch(() => false)

    if (isVisible) {
      await firstOption.click()
    }
    else {
      console.warn(`No options available in ${fieldName} dropdown`)
      await page.keyboard.press('Escape')
    }
  }

  await page.waitForTimeout(200) // Wait for selection to register
}

/**
 * Fill a multi-select combobox with multiple values
 */
export async function fillMultiCombobox(
  sidebarFrame: Frame,
  page: Page,
  fieldName: string,
  selections: ComboboxSelection[],
): Promise<void> {
  for (const selection of selections) {
    await fillCombobox(sidebarFrame, page, fieldName, selection)
    // After each selection, the dropdown closes - wait before next
    await page.waitForTimeout(300)
  }
}

/**
 * Fill all form fields with test data
 */
export async function fillCompleteForm(
  sidebarFrame: Frame,
  page: Page,
  formData: FormData,
): Promise<void> {
  // Fill title (required)
  const titleInput = sidebarFrame.locator('input[name="title"]')
  await titleInput.fill(formData.title)

  // Fill description (optional)
  if (formData.description) {
    const descInput = sidebarFrame.locator('textarea[name="description"]')
    await descInput.fill(formData.description)
  }

  // Fill notes (optional)
  if (formData.notes) {
    const notesInput = sidebarFrame.locator('textarea[name="notes"]')
    await notesInput.fill(formData.notes)
  }

  // Fill language (required) - defaults to selecting first option
  await fillCombobox(sidebarFrame, page, 'language', formData.language || { selectByIndex: 0 })

  // Fill resource type (required) - defaults to selecting first option
  await fillCombobox(sidebarFrame, page, 'resource_type', formData.resource_type || { selectByIndex: 0 })

  // Fill optional multi-select comboboxes
  if (formData.keywords?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'keywords', formData.keywords)
  }
  if (formData.pathways?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'pathways', formData.pathways)
  }
  if (formData.gorc_elements?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'gorc_elements', formData.gorc_elements)
  }
  if (formData.gorc_attributes?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'gorc_attributes', formData.gorc_attributes)
  }
  if (formData.interest_groups?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'interest_groups', formData.interest_groups)
  }
  if (formData.working_groups?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'working_groups', formData.working_groups)
  }
  if (formData.disciplines?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'disciplines', formData.disciplines)
  }
  if (formData.momsi?.length) {
    await fillMultiCombobox(sidebarFrame, page, 'momsi', formData.momsi)
  }
}

/**
 * Fill only the required form fields
 */
export async function fillRequiredFields(
  sidebarFrame: Frame,
  page: Page,
  title: string,
  language?: ComboboxSelection,
  resourceType?: ComboboxSelection,
): Promise<void> {
  // Fill title
  const titleInput = sidebarFrame.locator('input[name="title"]')
  await titleInput.fill(title)

  // Fill language
  await fillCombobox(sidebarFrame, page, 'language', language || { selectByIndex: 0 })

  // Fill resource type
  await fillCombobox(sidebarFrame, page, 'resource_type', resourceType || { selectByIndex: 0 })
}

/**
 * Get the current value of the title input
 */
export async function getTitleValue(sidebarFrame: Frame): Promise<string> {
  const titleInput = sidebarFrame.locator('input[name="title"]')
  return titleInput.inputValue()
}

/**
 * Get the current value of a combobox input by its label
 */
export async function getComboboxValue(
  sidebarFrame: Frame,
  fieldName: string,
): Promise<string> {
  const combobox = await findComboboxByLabel(sidebarFrame, fieldName)
  return combobox.input.inputValue()
}

/**
 * Check if the submit button is enabled
 */
export async function isSubmitButtonEnabled(sidebarFrame: Frame): Promise<boolean> {
  const submitButton = sidebarFrame.locator('button[type="submit"]')
  return submitButton.isEnabled()
}

/**
 * Check if the title input has validation error (HTML5)
 */
export async function hasTitleValidationError(sidebarFrame: Frame): Promise<boolean> {
  const titleInput = sidebarFrame.locator('input[name="title"]')
  return titleInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
}

/**
 * Toggle the "Remember my choices" switch
 */
export async function toggleRememberChoices(sidebarFrame: Frame): Promise<void> {
  const toggle = sidebarFrame.getByTestId('toggle-rememberChoices')
  await toggle.click({ force: true })
}

/**
 * Check if the "Remember my choices" switch is enabled
 */
export async function isRememberChoicesEnabled(sidebarFrame: Frame): Promise<boolean> {
  const toggle = sidebarFrame.getByTestId('toggle-rememberChoices')
  return toggle.isChecked()
}
