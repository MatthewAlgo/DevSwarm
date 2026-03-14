import { test, expect } from '@playwright/test';

test.describe('API Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('devswarm_user', JSON.stringify({ email: "admin@devswarm.io", name: "Admin", role: "admin" }));
    });
    await page.route('**/api/agents', async route => route.fulfill({ json: { "test": { id: "test", name: "Test API Agent", room: "War Room", status: "Idle", assignedTasks: [], techStack: [] } } }));
    await page.route('**/api/**', async route => route.fulfill({ json: {} }));
  });

  test('fetches and displays agents from API successfully', async ({ page }) => {
    // Intercept the API request to provide a reliable mock response
    await page.route('**/api/agents', async (route) => {
      const json = {
        "test-agent-1": {
          id: "test-agent-1",
          name: "Test API Agent",
          role: "Tester",
          systemPrompt: "Test",
          status: "Idle",
          room: "Desks",
          assignedTasks: [],
          avatarColor: "#ffffff",
          currentTask: null,
          thoughtChain: null,
          techStack: []
        }
      };
      await route.fulfill({ json });
    });

    await page.goto('/');

    // Wait and verify if our mocked agent appears on the page
    // Using string matching for partial since OfficeFloorPlan uses upper case or truncation
    await expect(page.getByText(/Test API Agent/i)).toBeVisible();
  });
});
