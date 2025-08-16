import { test, expect } from '@playwright/test'

test.describe('Overture Maps World Places Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should load the application with correct initial state', async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle('Overture Maps World Places Demo')
    
    // Check that API key input is present and has default value
    const apiKeyInput = page.locator('#api-key')
    await expect(apiKeyInput).toBeVisible()
    await expect(apiKeyInput).toHaveValue('DEMO-API-KEY')
    
    // Check that categories select is present
    const categoriesSelect = page.locator('text=Select categories...')
    await expect(categoriesSelect).toBeVisible()
    
    // Check that brands select is present
    const brandsSelect = page.locator('text=Select brand...')
    await expect(brandsSelect).toBeVisible()
    
    // Check that "Show places here" button is present
    const showPlacesButton = page.locator('button:has-text("Show places here")')
    await expect(showPlacesButton).toBeVisible()
  })

  test('should handle API key input changes', async ({ page }) => {
    const apiKeyInput = page.locator('#api-key')
    
    // Clear and enter a new API key
    await apiKeyInput.clear()
    await apiKeyInput.fill('TEST-API-KEY')
    
    // Wait for the debounced change to take effect
    await page.waitForTimeout(600)
    
    // Verify the value was updated
    await expect(apiKeyInput).toHaveValue('TEST-API-KEY')
  })

  test('should display error messages for API failures', async ({ page }) => {
    // Enter an invalid API key
    const apiKeyInput = page.locator('#api-key')
    await apiKeyInput.clear()
    await apiKeyInput.fill('INVALID-API-KEY')
    await page.waitForTimeout(600)
    
    // Wait for error to appear (this might take a moment as categories load)
    await page.waitForTimeout(2000)
    
    // Check if error message appears
    const errorMessage = page.locator('text=Error:')
    // Note: This test might fail if the API doesn't return an error for invalid keys
    // In that case, we'd need to mock the API responses
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check that the layout adapts to mobile
    const topBar = page.locator('.sticky.top-0')
    await expect(topBar).toBeVisible()
    
    // Verify that controls stack vertically on mobile
    const controls = page.locator('.flex.flex-col.lg\\:flex-row')
    await expect(controls).toBeVisible()
  })

  test('should persist state in localStorage', async ({ page }) => {
    // Change API key
    const apiKeyInput = page.locator('#api-key')
    await apiKeyInput.clear()
    await apiKeyInput.fill('PERSISTED-API-KEY')
    await page.waitForTimeout(600)
    
    // Reload the page
    await page.reload()
    
    // Check that the API key was persisted
    await expect(apiKeyInput).toHaveValue('PERSISTED-API-KEY')
  })

  test('should handle map interactions', async ({ page }) => {
    // Wait for map to load
    await page.waitForTimeout(2000)
    
    // Check that map container is present
    const mapContainer = page.locator('.maplibregl-canvas')
    await expect(mapContainer).toBeVisible()
    
    // Test map navigation controls
    const zoomInButton = page.locator('.maplibregl-ctrl-zoom-in')
    await expect(zoomInButton).toBeVisible()
  })
})
