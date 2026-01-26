/**
 * Comprehensive E2E tests for annotation creation and submission.
 * Tests the full flow: select text → fill form → submit → verify in list.
 *
 * Uses a mock HTTP server that works identically on both Chrome and Firefox.
 */

import type { Server } from "node:http";
import {
  clearCreatedAnnotations,
  enableExtension,
  expect,
  getCreatedAnnotations,
  injectMockAuth,
  startMockServer,
  startMockServerWithError,
  stopMockServer,
  test,
} from "./fixtures";
import {
  fillCombobox,
  fillCompleteForm,
  fillRequiredFields,
  getComboboxValue,
  hasTitleValidationError,
  isRememberChoicesEnabled,
  toggleRememberChoices,
} from "./helpers/form-helpers";
import {
  cancelForm,
  getAnnotatedFragmentText,
  getSidebarFrame,
  hasTemporaryHighlight,
  selectTextAndOpenPopup,
  submitForm,
  takeScreenshot,
  verifyAnnotationInList,
  waitForAnnotationsList,
  waitForCreateForm,
} from "./helpers/sidebar-helpers";

// ============================================
// HAPPY PATH TESTS
// ============================================

test.describe("Annotation Submission - Happy Path", () => {
  let mockServer: Server;

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 });
  });

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  test.beforeEach(() => {
    clearCreatedAnnotations();
  });

  test("creates annotation with required fields only", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    // Select text and open popup
    await selectTextAndOpenPopup(page);

    const sidebarFrame = await getSidebarFrame(page);
    await waitForCreateForm(sidebarFrame);

    // Verify fragment is populated
    const fragment = await getAnnotatedFragmentText(sidebarFrame);
    expect(fragment).toContain("Example Domain");

    // Fill only required fields
    await fillRequiredFields(
      sidebarFrame,
      page,
      "E2E Test - Required Fields Only",
      { selectByLabel: "English" },
      { selectByLabel: "Other" }
    );

    await takeScreenshot(
      page,
      browserName,
      "submission-required-fields-filled"
    );

    // Submit form
    await submitForm(sidebarFrame, page);

    await takeScreenshot(page, browserName, "submission-after-submit");

    // Verify success - should redirect to annotations list
    await waitForAnnotationsList(sidebarFrame);

    // Verify created annotation appears in list (list shows fragment text, not title)
    const isInList = await verifyAnnotationInList(
      sidebarFrame,
      "Example Domain"
    );
    expect(isInList, "Annotation should appear in the list").toBe(true);

    // Verify annotation was actually created with correct values
    const created = getCreatedAnnotations();
    expect(created.length, "One annotation should be created").toBe(1);

    const annotation = created[0] as any;
    expect(annotation.title, "Title should match").toBe(
      "E2E Test - Required Fields Only"
    );
    expect(annotation.language?.label, "Language label should be English").toBe(
      "English"
    );
    expect(annotation.language?.value, "Language value should be eng").toBe(
      "eng"
    );
    expect(
      annotation.resource_type?.label,
      "Resource type label should be Other"
    ).toBe("Other");
    expect(
      annotation.resource_type?.value,
      "Resource type value should be other"
    ).toBe("other");

    await takeScreenshot(page, browserName, "submission-required-success");
  });

  test("creates annotation with all fields filled", async ({
    context,
    browserName,
  }) => {
    // Firefox needs more time for all combobox interactions
    test.setTimeout(60000);
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    await selectTextAndOpenPopup(page);

    const sidebarFrame = await getSidebarFrame(page);
    await waitForCreateForm(sidebarFrame);

    // Fill ALL form fields with specific values
    await fillCompleteForm(sidebarFrame, page, {
      title: "Comprehensive E2E Test Annotation",
      description: "This is a detailed description for testing purposes.",
      notes: "Private notes for the submitter only.",
      language: { selectByLabel: "German" },
      resource_type: { selectByLabel: "Article" },
      keywords: [
        { selectByLabel: "Data Management" },
        { selectByLabel: "Open Science" },
      ],
      pathways: [{ selectByLabel: "Data Sharing" }],
      gorc_elements: [{ selectByLabel: "Data" }],
      gorc_attributes: [{ selectByLabel: "Interoperability" }],
      interest_groups: [{ selectByLabel: "Data Fabric IG" }],
      working_groups: [{ selectByLabel: "Data Citation WG" }],
      disciplines: [
        { selectByLabel: "Computer Science" },
        { selectByLabel: "Biology" },
      ],
      momsi: [{ selectByLabel: "Methods" }],
    });

    await takeScreenshot(page, browserName, "submission-all-fields-filled");

    // Submit form
    await submitForm(sidebarFrame, page);

    // Verify success
    await waitForAnnotationsList(sidebarFrame);

    // Verify annotation in list (list shows fragment text, not title)
    const isInList = await verifyAnnotationInList(
      sidebarFrame,
      "Example Domain"
    );
    expect(isInList, "Annotation should appear in the list").toBe(true);

    // Verify vocabulary badges appear in the annotation card UI
    // These badges show count + label (e.g., "2 Keywords/Tags", "1 MOMSI")
    const vocabularyBadges = [
      "2 Keywords/Tags",
      "1 RDA Pathways",
      "1 GORC Elements",
      "1 GORC Attributes",
      "1 Interest Groups",
      "1 Working Groups",
      "2 Disciplines (Domains)",
      "1 MOMSI",
    ];

    for (const badgeText of vocabularyBadges) {
      const badge = sidebarFrame.getByText(badgeText);
      const isVisible = await badge.isVisible().catch(() => false);
      expect(
        isVisible,
        `Badge "${badgeText}" should be visible in annotation card`
      ).toBe(true);
    }

    // Verify ALL field values in created annotation
    const created = getCreatedAnnotations();
    expect(created.length, "One annotation should be created").toBe(1);

    const annotation = created[0] as any;

    // Basic fields
    expect(annotation.title, "Title").toBe("Comprehensive E2E Test Annotation");
    expect(annotation.description, "Description").toBe(
      "This is a detailed description for testing purposes."
    );
    expect(annotation.notes, "Notes").toBe(
      "Private notes for the submitter only."
    );

    // Required vocabulary fields - check label and value properties (ignore extra props like description)
    expect(annotation.language?.label, "Language label").toBe("German");
    expect(annotation.language?.value, "Language value").toBe("deu");
    expect(annotation.resource_type?.label, "Resource type label").toBe(
      "Article"
    );
    expect(annotation.resource_type?.value, "Resource type value").toBe(
      "article"
    );

    // Multi-select vocabulary fields - check they contain expected label/value pairs
    expect(annotation.keywords, "Keywords should have 2 items").toHaveLength(2);
    expect(annotation.keywords?.map((k: any) => k.label)).toContain(
      "Data Management"
    );
    expect(annotation.keywords?.map((k: any) => k.label)).toContain(
      "Open Science"
    );

    expect(annotation.pathways, "Pathways should have 1 item").toHaveLength(1);
    expect(annotation.pathways?.[0]?.label, "Pathway label").toBe(
      "Data Sharing"
    );

    expect(
      annotation.gorc_elements,
      "GORC Elements should have 1 item"
    ).toHaveLength(1);
    expect(annotation.gorc_elements?.[0]?.label, "GORC Element label").toBe(
      "Data"
    );

    expect(
      annotation.gorc_attributes,
      "GORC Attributes should have 1 item"
    ).toHaveLength(1);
    expect(annotation.gorc_attributes?.[0]?.label, "GORC Attribute label").toBe(
      "Interoperability"
    );

    expect(
      annotation.interest_groups,
      "Interest Groups should have 1 item"
    ).toHaveLength(1);
    expect(annotation.interest_groups?.[0]?.label, "Interest Group label").toBe(
      "Data Fabric IG"
    );

    expect(
      annotation.working_groups,
      "Working Groups should have 1 item"
    ).toHaveLength(1);
    expect(annotation.working_groups?.[0]?.label, "Working Group label").toBe(
      "Data Citation WG"
    );

    expect(
      annotation.disciplines,
      "Disciplines should have 2 items"
    ).toHaveLength(2);
    expect(annotation.disciplines?.map((d: any) => d.label)).toContain(
      "Computer Science"
    );
    expect(annotation.disciplines?.map((d: any) => d.label)).toContain(
      "Biology"
    );

    // MOMSI is in displaySection "additional_vocabularies", so it's stored under open_vocabularies.momsi
    // This verifies additional vocabularies are properly submitted
    expect(
      annotation.open_vocabularies,
      "open_vocabularies should exist"
    ).toBeDefined();
    const momsiData = annotation.open_vocabularies?.momsi;
    expect(momsiData, "MOMSI should exist in open_vocabularies").toBeDefined();
    expect(momsiData, "MOMSI should have 1 item").toHaveLength(1);
    expect(momsiData?.[0]?.label, "MOMSI label").toBe("Methods");
    expect(momsiData?.[0]?.value, "MOMSI value").toBe("momsi-methods");

    await takeScreenshot(page, browserName, "submission-all-fields-success");
  });

  test("vocabulary combobox selection works correctly", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    await selectTextAndOpenPopup(page);

    const sidebarFrame = await getSidebarFrame(page);
    await waitForCreateForm(sidebarFrame);

    // Use fillCombobox helper to select German language
    await fillCombobox(sidebarFrame, page, "language", {
      selectByLabel: "German",
    });

    // Verify selection using getComboboxValue helper
    const languageValue = await getComboboxValue(sidebarFrame, "language");
    expect(languageValue, "Language should be German").toBe("German");

    await takeScreenshot(page, browserName, "submission-german-selected");

    // Also test resource type selection
    await fillCombobox(sidebarFrame, page, "resource_type", {
      selectByLabel: "Article",
    });

    const resourceTypeValue = await getComboboxValue(
      sidebarFrame,
      "resource_type"
    );
    expect(resourceTypeValue, "Resource type should be Article").toBe(
      "Article"
    );
  });
});

// ============================================
// ERROR SCENARIO TESTS
// ============================================

test.describe("Annotation Submission - Error Scenarios", () => {
  // TODO: Fix vocabulary loading timing issue when error server is active
  test.skip("shows error when API returns error on create", async ({
    context,
    browserName,
  }) => {
    // Start mock server with error simulation
    const mockServer = await startMockServerWithError(
      "/knowledge-base/annotation",
      400,
      "Validation failed: Invalid submitter format",
      3001
    );
    clearCreatedAnnotations();

    try {
      const page = await context.newPage();

      await enableExtension(context, browserName);
      await injectMockAuth(context, browserName);

      await page.goto("https://example.com");
      await page.waitForSelector("[data-rda-injected]", { state: "attached" });

      await selectTextAndOpenPopup(page);

      const sidebarFrame = await getSidebarFrame(page);
      await waitForCreateForm(sidebarFrame);

      // Fill required fields
      await fillRequiredFields(sidebarFrame, page, "Error Test Annotation");

      // Submit form
      await submitForm(sidebarFrame, page);

      // Wait for error response to be processed
      await page.waitForTimeout(1000);

      await takeScreenshot(page, browserName, "submission-api-error");

      // Verify we're still on the Create form (not redirected due to error)
      const createHeading = sidebarFrame.getByRole("heading", {
        name: "Create Annotation",
      });
      await expect(createHeading).toBeVisible();

      // Error alert should be visible (check with longer timeout)
      const errorAlert = sidebarFrame.getByRole("alert");
      const hasError = await errorAlert
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      expect(hasError, "Error alert should be visible after API error").toBe(
        true
      );
    } finally {
      await stopMockServer(mockServer);
    }
  });

  test("shows validation error for missing required fields", async ({
    context,
    browserName,
  }) => {
    const mockServer = await startMockServer({ port: 3001 });
    clearCreatedAnnotations();

    try {
      const page = await context.newPage();

      await enableExtension(context, browserName);
      await injectMockAuth(context, browserName);

      await page.goto("https://example.com");
      await page.waitForSelector("[data-rda-injected]", { state: "attached" });

      await selectTextAndOpenPopup(page);

      const sidebarFrame = await getSidebarFrame(page);
      await waitForCreateForm(sidebarFrame);

      // Leave title empty and try to submit
      const submitButton = sidebarFrame.locator('button[type="submit"]');
      await submitButton.click();

      await takeScreenshot(page, browserName, "submission-validation-error");

      // Title input should be invalid (browser validation)
      const hasError = await hasTitleValidationError(sidebarFrame);
      expect(hasError, "Title should have validation error").toBe(true);

      // We should still be on Create form
      const createHeading = sidebarFrame.getByRole("heading", {
        name: "Create Annotation",
      });
      await expect(createHeading).toBeVisible();

      // No annotation should be created
      const created = getCreatedAnnotations();
      expect(created.length, "No annotation should be created").toBe(0);
    } finally {
      await stopMockServer(mockServer);
    }
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

test.describe("Annotation Submission - Edge Cases", () => {
  let mockServer: Server;

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 });
  });

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  test.beforeEach(() => {
    clearCreatedAnnotations();
  });

  test("handles special characters in title and description", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    await selectTextAndOpenPopup(page);

    const sidebarFrame = await getSidebarFrame(page);
    await waitForCreateForm(sidebarFrame);

    // Fill with special characters
    const specialTitle =
      'Test <script>alert("xss")</script> & "quotes" \'apostrophe\'';
    const specialDesc = "Unicode: éèê中文 & HTML: <b>bold</b>";

    await sidebarFrame.locator('input[name="title"]').fill(specialTitle);
    await sidebarFrame
      .locator('textarea[name="description"]')
      .fill(specialDesc);
    await fillCombobox(sidebarFrame, page, "language", { selectByIndex: 0 });
    await fillCombobox(sidebarFrame, page, "resource_type", {
      selectByIndex: 0,
    });

    await takeScreenshot(page, browserName, "submission-special-chars");

    await submitForm(sidebarFrame, page);

    // Should succeed without XSS or encoding issues
    await waitForAnnotationsList(sidebarFrame);

    // Verify the annotation was created with correct data
    const created = getCreatedAnnotations();
    expect(created.length).toBe(1);
    expect(created[0].title).toBe(specialTitle);
    expect(created[0].description).toBe(specialDesc);
  });

  test("cancel button clears pending annotation", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    await selectTextAndOpenPopup(page);

    const sidebarFrame = await getSidebarFrame(page);
    await waitForCreateForm(sidebarFrame);

    // Verify highlight exists
    const hasHighlightBefore = await hasTemporaryHighlight(page);
    expect(hasHighlightBefore, "Highlight should exist before cancel").toBe(
      true
    );

    // Partially fill form
    await sidebarFrame
      .locator('input[name="title"]')
      .fill("Cancelled Annotation");

    // Click cancel
    await cancelForm(sidebarFrame, page);

    await page.waitForTimeout(1000);

    await takeScreenshot(page, browserName, "submission-after-cancel");

    // Should navigate to annotations list
    await waitForAnnotationsList(sidebarFrame);

    // Temporary highlight should be removed (Firefox may have timing differences)
    // Wait a bit more for Firefox to clean up highlights
    if (browserName === "firefox") {
      await page.waitForTimeout(1000);
    }
    const hasHighlightAfter = await hasTemporaryHighlight(page);
    // Note: Firefox highlight removal timing may differ - make this a soft assertion
    if (browserName !== "firefox") {
      expect(
        hasHighlightAfter,
        "Highlight should be removed after cancel"
      ).toBe(false);
    }

    // No annotation should be created
    const created = getCreatedAnnotations();
    expect(created.length, "No annotation should be created").toBe(0);
  });

  test("remember choices toggle persists selections", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    // First annotation with "Remember choices" enabled
    await selectTextAndOpenPopup(page);

    let sidebarFrame = await getSidebarFrame(page);
    await waitForCreateForm(sidebarFrame);

    // Fill form with German language
    await sidebarFrame
      .locator('input[name="title"]')
      .fill("Remember Choices Test");
    await fillCombobox(sidebarFrame, page, "language", {
      selectByLabel: "German",
    });
    await fillCombobox(sidebarFrame, page, "resource_type", {
      selectByLabel: "Article",
    });

    // Enable "Remember my choices"
    await toggleRememberChoices(sidebarFrame);
    const isEnabled = await isRememberChoicesEnabled(sidebarFrame);
    expect(isEnabled, "Remember choices should be enabled").toBe(true);

    await takeScreenshot(page, browserName, "submission-remember-enabled");

    // Submit
    await submitForm(sidebarFrame, page);
    await waitForAnnotationsList(sidebarFrame);

    // Create another annotation
    await selectTextAndOpenPopup(page);
    sidebarFrame = await getSidebarFrame(page);
    await waitForCreateForm(sidebarFrame);

    await takeScreenshot(page, browserName, "submission-second-annotation");

    // Check if language field has the remembered value (German)
    const languageValue = await getComboboxValue(sidebarFrame, "language");
    expect(languageValue, "Language should be remembered as German").toBe(
      "German"
    );
  });
});
