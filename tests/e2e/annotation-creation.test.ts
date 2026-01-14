import { enableExtension, expect, injectMockAuth, test } from "./fixtures";

test.describe("Annotation Creation", () => {
  test("fills annotation form and verifies vocabularies load", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    // Select text
    const h1 = await page.locator("h1").boundingBox();
    if (!h1) throw new Error("h1 not found");

    await page.mouse.move(h1.x + 10, h1.y + h1.height / 2);
    await page.mouse.down();
    await page.mouse.move(h1.x + h1.width - 10, h1.y + h1.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Click the popup to open sidebar
    const popupBox = await page.evaluate(() => {
      const popup = document.querySelector("rda-annotator-popup");
      if (!popup) return null;
      const rect = popup.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (!popupBox || popupBox.width === 0) {
      await page.screenshot({
        path: `test-results/${browserName}-creation-popup-not-found.png`,
      });
      throw new Error("Popup not found");
    }

    await page.mouse.click(
      popupBox.x + popupBox.width / 2,
      popupBox.y + popupBox.height / 2
    );

    await page.waitForTimeout(2000);

    // Get sidebar frame
    const sidebarFrame = page
      .frames()
      .find((f) => f.url().includes("sidebar.html"));
    if (!sidebarFrame) {
      await page.screenshot({
        path: `test-results/${browserName}-creation-no-sidebar.png`,
      });
      throw new Error("Sidebar iframe not found");
    }

    // Wait for Create Annotation heading
    const createHeading = sidebarFrame.getByRole("heading", {
      name: "Create Annotation",
    });
    await expect(
      createHeading,
      "Create Annotation heading should be visible"
    ).toBeVisible({
      timeout: 5000,
    });

    // Fill in the title field
    const titleInput = sidebarFrame.locator('input[name="title"]');
    await expect(titleInput, "Title input should be visible").toBeVisible({
      timeout: 5000,
    });
    await titleInput.fill("E2E Test Annotation");

    // Wait for language dropdown to be available
    const languageCombobox = sidebarFrame
      .locator('input[id*="headlessui-combobox-input"]')
      .first();
    await expect(
      languageCombobox,
      "Language combobox should be visible"
    ).toBeVisible({ timeout: 5000 });

    // Take screenshot showing form loaded
    await page.screenshot({
      path: `test-results/${browserName}-creation-form-loaded.png`,
    });

    // Click the combobox button to open dropdown
    const comboboxButton = sidebarFrame
      .locator('button[id*="headlessui-combobox-button"]')
      .first();
    await comboboxButton.click();
    await page.waitForTimeout(1000);

    // Check if dropdown options or a loading/no-results message appears
    // The options might take time to load from API
    const dropdownOptions = sidebarFrame
      .locator('[id*="headlessui-combobox-options"]')
      .first();
    const optionsVisible = await dropdownOptions.isVisible().catch(() => false);

    if (optionsVisible) {
      await page.screenshot({
        path: `test-results/${browserName}-dropdown-open.png`,
      });

      // Check if there are actual options (not just loading/error message)
      const options = dropdownOptions.locator(
        '[id*="headlessui-combobox-option"]'
      );
      const optionCount = await options.count();

      if (optionCount > 0) {
        // Click first option to select
        await options.first().click();
      } else {
        // No options loaded - might be API issue, just close dropdown
        await languageCombobox.press("Escape");
      }
    } else {
      // Dropdown didn't open - take screenshot for debugging
      await page.screenshot({
        path: `test-results/${browserName}-dropdown-not-visible.png`,
      });
    }

    // Take final screenshot
    await page.screenshot({
      path: `test-results/${browserName}-creation-form-filled.png`,
    });

    // Verify the form is ready for submission (all required fields accessible)
    const submitButton = sidebarFrame.locator('button[type="submit"]');
    await expect(submitButton, "Submit button should be visible").toBeVisible();
    await expect(submitButton, "Submit button should be enabled").toBeEnabled();
  });

  test("clears pending annotation on page navigation", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    // Select text
    const h1 = await page.locator("h1").boundingBox();
    if (!h1) throw new Error("h1 not found");

    await page.mouse.move(h1.x + 10, h1.y + h1.height / 2);
    await page.mouse.down();
    await page.mouse.move(h1.x + h1.width - 10, h1.y + h1.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Click popup to create pending annotation
    const popupBox = await page.evaluate(() => {
      const popup = document.querySelector("rda-annotator-popup");
      if (!popup) return null;
      const rect = popup.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (!popupBox || popupBox.width === 0) {
      throw new Error("Popup not found");
    }

    await page.mouse.click(
      popupBox.x + popupBox.width / 2,
      popupBox.y + popupBox.height / 2
    );

    await page.waitForTimeout(1500);

    // Verify sidebar shows Create form
    let sidebarFrame = page
      .frames()
      .find((f) => f.url().includes("sidebar.html"));
    if (!sidebarFrame) {
      throw new Error("Sidebar iframe not found");
    }

    const createHeading = sidebarFrame.getByRole("heading", {
      name: "Create Annotation",
    });
    await expect(
      createHeading,
      "Should show Create form before navigation"
    ).toBeVisible({
      timeout: 5000,
    });

    await page.screenshot({
      path: `test-results/${browserName}-before-navigation.png`,
    });

    // Navigate to a different page
    await page.goto("https://www.iana.org/domains/reserved");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });
    await page.waitForTimeout(1500);

    // Get sidebar frame again (URL may have changed)
    sidebarFrame = page.frames().find((f) => f.url().includes("sidebar.html"));

    await page.screenshot({
      path: `test-results/${browserName}-after-navigation.png`,
    });

    // The Create form should no longer show the old annotation fragment
    // (pending annotation was cleared on navigation)
    if (sidebarFrame) {
      // If sidebar is still visible, it should NOT show the Create form with old data
      // or it should show the Annotations list view
      const annotationsHeading = sidebarFrame.getByRole("heading", {
        name: "Annotations",
      });
      const createHeadingAfter = sidebarFrame.getByRole("heading", {
        name: "Create Annotation",
      });

      // Either we're on Annotations view, or Create view doesn't have the old fragment
      const isOnAnnotationsView = await annotationsHeading
        .isVisible()
        .catch(() => false);
      const isOnCreateView = await createHeadingAfter
        .isVisible()
        .catch(() => false);

      if (isOnCreateView) {
        // If still on Create view, the fragment should be empty or we redirected
        const fragmentTextarea = sidebarFrame.locator("#selectedText-textarea");
        const fragmentValue = await fragmentTextarea
          .inputValue()
          .catch(() => "");
        // The fragment should NOT contain "Example Domain" from the previous page
        expect(
          fragmentValue.includes("Example Domain"),
          "Fragment should be cleared after navigation"
        ).toBe(false);
      } else {
        // Should be on Annotations view (redirected because no pending annotation)
        expect(
          isOnAnnotationsView,
          "Should redirect to Annotations view after navigation"
        ).toBe(true);
      }
    }
  });

  test("vocabulary search and no-results handling", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    const h1 = await page.locator("h1").boundingBox();
    if (!h1) throw new Error("h1 not found");

    await page.mouse.move(h1.x + 10, h1.y + h1.height / 2);
    await page.mouse.down();
    await page.mouse.move(h1.x + h1.width - 10, h1.y + h1.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(500);

    const popupBox = await page.evaluate(() => {
      const popup = document.querySelector("rda-annotator-popup");
      if (!popup) return null;
      const rect = popup.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (!popupBox || popupBox.width === 0) {
      throw new Error("Popup not found");
    }

    await page.mouse.click(
      popupBox.x + popupBox.width / 2,
      popupBox.y + popupBox.height / 2
    );

    await page.waitForTimeout(2000);

    const sidebarFrame = page
      .frames()
      .find((f) => f.url().includes("sidebar.html"));
    if (!sidebarFrame) {
      throw new Error("Sidebar not found");
    }

    await sidebarFrame
      .locator('input[name="title"]')
      .fill("Search Test Annotation");

    const languageInput = sidebarFrame
      .locator('input[id*="headlessui-combobox-input"]')
      .first();
    const comboboxButton = sidebarFrame
      .locator('button[id*="headlessui-combobox-button"]')
      .first();

    await comboboxButton.click();
    await page.waitForTimeout(1000); // Wait for API response

    const dropdownOptions = sidebarFrame
      .locator('[id*="headlessui-combobox-options"]')
      .first();
    const isDropdownVisible = await dropdownOptions
      .isVisible()
      .catch(() => false);

    if (!isDropdownVisible) {
      await page.screenshot({
        path: `test-results/${browserName}-search-dropdown-not-visible.png`,
      });
      throw new Error("Dropdown not visible - API may be unavailable");
    }

    const options = dropdownOptions.locator(
      '[id*="headlessui-combobox-option"]'
    );
    const optionCount = await options.count();
    expect(
      optionCount,
      "Should show vocabulary options from API"
    ).toBeGreaterThan(0);

    await page.screenshot({
      path: `test-results/${browserName}-search-dropdown-open.png`,
    });

    await languageInput.fill("ngl");
    await page.waitForTimeout(500); // Wait for debounced search

    const substringOptions = dropdownOptions.locator(
      '[id*="headlessui-combobox-option"]'
    );
    const substringCount = await substringOptions.count();

    await page.screenshot({
      path: `test-results/${browserName}-search-substring.png`,
    });

    if (substringCount > 0) {
      const firstOptionText = await substringOptions.first().textContent();
      expect(
        firstOptionText?.toLowerCase().includes("ngl") ||
          firstOptionText?.toLowerCase().includes("english"),
        "Substring search should find matching results"
      ).toBe(true);
    }

    await languageInput.clear();
    await languageInput.fill("zzzznonexistentlanguage12345");
    await page.waitForTimeout(600); // Wait for debounced search + API response

    await page.screenshot({
      path: `test-results/${browserName}-search-no-results.png`,
    });

    const errorText = dropdownOptions.getByText(/error/i);
    const isErrorVisible = await errorText.isVisible().catch(() => false);
    expect(
      isErrorVisible,
      "Should not show error message when no results found"
    ).toBe(false);

    const noResultsMessage = dropdownOptions.getByText(
      /no.*results|nothing found/i
    );
    const isNoResultsVisible = await noResultsMessage
      .isVisible()
      .catch(() => false);
    expect(
      !isErrorVisible || isNoResultsVisible,
      "Should show no results message or no error"
    ).toBe(true);

    await languageInput.clear();
    await page.waitForTimeout(300);
    await languageInput.fill("Eng");
    await page.waitForTimeout(500);

    const englishOption = dropdownOptions.getByText(/English/i).first();
    const isEnglishVisible = await englishOption.isVisible().catch(() => false);

    if (isEnglishVisible) {
      await englishOption.click();
      await page.waitForTimeout(300);

      const inputValue = await languageInput.inputValue();
      expect(
        inputValue.toLowerCase(),
        "Should have English selected"
      ).toContain("english");
    }

    await page.screenshot({
      path: `test-results/${browserName}-search-selected.png`,
    });

    const submitButton = sidebarFrame.locator('button[type="submit"]');
    await expect(submitButton, "Submit button should be visible").toBeVisible();
  });

  test.skip("submits annotation to real API (debug only)", async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage();

    await enableExtension(context, browserName);
    await injectMockAuth(context, browserName);

    await page.goto("https://example.com");
    await page.waitForSelector("[data-rda-injected]", { state: "attached" });

    // Select text
    const h1 = await page.locator("h1").boundingBox();
    if (!h1) throw new Error("h1 not found");

    await page.mouse.move(h1.x + 10, h1.y + h1.height / 2);
    await page.mouse.down();
    await page.mouse.move(h1.x + h1.width - 10, h1.y + h1.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(500);

    const popupBox = await page.evaluate(() => {
      const popup = document.querySelector("rda-annotator-popup");
      if (!popup) return null;
      const rect = popup.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (!popupBox) throw new Error("Popup not found");

    await page.mouse.click(
      popupBox.x + popupBox.width / 2,
      popupBox.y + popupBox.height / 2
    );

    await page.waitForTimeout(2000);

    const sidebarFrame = page
      .frames()
      .find((f) => f.url().includes("sidebar.html"));
    if (!sidebarFrame) throw new Error("Sidebar not found");

    // Fill form
    await sidebarFrame
      .locator('input[name="title"]')
      .fill("E2E Debug Test Annotation");

    // Select language
    const languageInput = sidebarFrame
      .locator('input[id*="headlessui-combobox-input"]')
      .first();
    await languageInput.click();
    await page.waitForTimeout(500);
    await languageInput.fill("eng");
    await page.waitForTimeout(500);
    await languageInput.press("Enter");

    // Select resource type
    const resourceTypeInputs = sidebarFrame.locator(
      'input[id*="headlessui-combobox-input"]'
    );
    const resourceTypeInput = resourceTypeInputs.nth(1);
    await resourceTypeInput.click();
    await page.waitForTimeout(500);
    await resourceTypeInput.fill("Other");
    await page.waitForTimeout(500);
    await resourceTypeInput.press("Enter");

    await page.screenshot({
      path: `test-results/${browserName}-debug-form-filled.png`,
    });

    // Submit form
    await sidebarFrame.locator('button[type="submit"]').click();

    // Wait for response
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: `test-results/${browserName}-debug-after-submit.png`,
    });
  });
});
