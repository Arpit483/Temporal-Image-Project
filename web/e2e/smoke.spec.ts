import { test, expect } from '@playwright/test';

test.describe('FrameFill End-to-End Smoke Test', () => {
  test('upload -> predict -> view -> difference map -> download -> AI chat', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Visit the home / predict page
    await page.goto('/');
    await expect(page).toHaveTitle(/FrameFill/i);

    // Verify persistent warning banner is visible
    await expect(
      page.getByText(/Synthetic frames are model output, not observations/i)
    ).toBeVisible();

    // Verify AI Chatbot launcher is visible
    const aiBtn = page.getByRole('button', { name: /Ask AI|Open AI Assistant/i });
    await expect(aiBtn).toBeVisible();

    // 2. Click "Load Sample NetCDFs" to populate real test frames
    const demoBtn = page.getByRole('button', { name: /Load Sample NetCDFs|Load Demo Triplet/i });
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Verify files were populated
    await expect(page.getByText(/goes19_t00_0000\.nc/i)).toBeVisible();
    await expect(page.getByText(/goes19_t20_0020\.nc/i)).toBeVisible();

    // 3. Click "Predict Middle Frame"
    const predictBtn = page.getByRole('button', { name: /Predict Middle Frame/i });
    await predictBtn.click();

    // 4. Wait for results section to appear (neural model takes ~15-20s on 512x512)
    await expect(page.getByText(/Synthesized Middle Frame/i)).toBeVisible({ timeout: 35000 });
    await expect(page.getByLabel(/Synthetic frame/i)).toBeVisible();

    // 5. Verify Difference Map and Metrics Table are rendered
    await expect(page.getByText(/Ground Truth Validation & Difference Map/i)).toBeVisible();
    await expect(page.getByText(/Validation Metrics/i)).toBeVisible();

    // 6. Verify download link is present and valid
    const downloadNcLink = page.getByRole('link', { name: /Download \.nc/i });
    await expect(downloadNcLink).toBeVisible();
    const downloadHref = await downloadNcLink.getAttribute('href');
    expect(downloadHref).toMatch(/\/api\/download\/[a-zA-Z0-9]+/);

    // 7. Click "Open in Viewer"
    const openViewerLink = page.getByRole('link', { name: /Open in Viewer/i });
    await openViewerLink.click();

    // 8. Verify Viewer loaded with play controls
    await expect(page).toHaveURL(/\/viewer/);
    await expect(page.getByText(/Synchronized Frame Viewer/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Play/i })).toBeVisible();

    // 9. Test Explainable AI Chat panel interaction
    await aiBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('FrameFill AI', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/Ask anything about this image/i)).toBeVisible();

    // 10. Test Light Mode Toggle
    const themeToggleBtn = page.getByRole('button', { name: /Switch to (Light|Dark) Mode/i });
    await expect(themeToggleBtn).toBeVisible();
    await themeToggleBtn.click();
    await expect(page.locator('html')).toHaveClass(/light/);
    await themeToggleBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
