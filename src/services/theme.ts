/**
 * Theme Service
 * Integrates with Quasar's dark mode and applies custom CSS variables
 */

import { Dark, setCssVar } from 'quasar'
import darkTheme from 'src/config/themes/dark.json'
import lightTheme from 'src/config/themes/light.json'

type ThemeName = 'light' | 'dark'
type ThemeVariables = Record<string, string>

class ThemeService {
  private currentTheme: ThemeName = 'light'
  private themeMap: Record<ThemeName, ThemeVariables> = {
    dark: darkTheme as ThemeVariables,
    light: lightTheme as ThemeVariables
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  initialize(): void {
    const savedTheme = localStorage.getItem('lepton-theme') as ThemeName | null

    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      this.setTheme(savedTheme)
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      this.setTheme(prefersDark ? 'dark' : 'light')
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('lepton-theme')) {
        this.setTheme(e.matches ? 'dark' : 'light')
      }
    })

    console.debug(`[Theme] Initialized with ${this.currentTheme} theme`)
  }

  /**
   * Set theme (light or dark)
   */
  setTheme(theme: ThemeName): void {
    if (theme === this.currentTheme) {
      return
    }

    this.currentTheme = theme
    this.applyTheme(theme)

    // Save to localStorage
    localStorage.setItem('lepton-theme', theme)

    console.debug(`[Theme] Switched to ${theme} theme`)
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light'
    this.setTheme(newTheme)
  }

  /**
   * Get current theme name
   */
  getCurrentTheme(): ThemeName {
    return this.currentTheme
  }

  /**
   * Check if dark mode is active
   */
  isDarkMode(): boolean {
    return this.currentTheme === 'dark'
  }

  /**
   * Apply theme CSS variables and Quasar dark mode
   */
  private applyTheme(theme: ThemeName): void {
    // Set Quasar dark mode
    Dark.set(theme === 'dark')

    // Apply custom CSS variables
    const themeVariables = this.themeMap[theme]

    Object.entries(themeVariables).forEach(([key, value]) => {
      // Use Quasar's setCssVar for reactivity
      setCssVar(key, value)

      // Also set on document root for compatibility
      document.documentElement.style.setProperty(`--${key}`, value)
    })
  }

  /**
   * Get theme variable value
   */
  getVariable(variableName: string): string | undefined {
    return this.themeMap[this.currentTheme][variableName]
  }

  /**
   * Get all variables for current theme
   */
  getCurrentVariables(): ThemeVariables {
    return { ...this.themeMap[this.currentTheme] }
  }
}

// Export singleton instance
export const themeService = new ThemeService()

// Export class for testing
export { ThemeService }
export type { ThemeName, ThemeVariables }
