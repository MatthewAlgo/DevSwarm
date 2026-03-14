import { test, expect } from '@playwright/test';

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('devswarm_user', JSON.stringify({ email: "admin@devswarm.io", name: "Admin", role: "admin" }));
    });
    await page.route('**/api/agents', async route => route.fulfill({ json: { "test": { id: "test", name: "Test API Agent", room: "War Room", status: "Idle", assignedTasks: [], techStack: [] } } }));
    await page.route('**/api/**', async route => route.fulfill({ json: {} }));
  });

  test('navigates between all main tabs correctly', async ({ page }) => {
    // Start at root
    await page.goto('/');
    await expect(page).toHaveTitle(/DevSwarm/);

    // Assert initial floor plan state
    await expect(page.getByText('War Room')).toBeVisible();

    // Click Kanban Board tab
    await page.click('text=Board');
    await expect(page.url()).toContain('/kanban');
    await expect(page.getByText('Swarm Task Board')).toBeVisible();

    // Click Agents/Swarm tab
    await page.click('text=Swarm');
    await expect(page.url()).toContain('/agents');

    // Click Activity/Neural tab
    await page.click('text=Neural');
    await expect(page.url()).toContain('/activity');
    
    // Click Settings/Config tab
    await page.click('text=Config');
    await expect(page.url()).toContain('/settings');
  });
});
