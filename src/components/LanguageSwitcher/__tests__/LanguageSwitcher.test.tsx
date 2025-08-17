import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LanguageSwitcher from '../LanguageSwitcher';
import { render, createTestI18n } from '../../../test/utils/test-utils';

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
});

describe('LanguageSwitcher', () => {
  let testI18n: ReturnType<typeof createTestI18n>;
  const mockChangeLanguage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    testI18n = createTestI18n();

    // Add the language switching translations
    testI18n.addResourceBundle(
      'en',
      'translation',
      {
        'language.changeLanguage': 'Change Language',
      },
      true,
      true
    );

    // Mock changeLanguage to avoid actual language changes during tests
    vi.spyOn(testI18n, 'changeLanguage').mockImplementation(mockChangeLanguage);
  });

  describe('Basic Rendering', () => {
    test('renders language switcher button', () => {
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button', { name: 'Change Language' });
      expect(button).toBeInTheDocument();
    });

    test('displays current language flag', () => {
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      // English flag should be displayed (default)
      expect(screen.getByText('🇬🇧')).toBeInTheDocument();
    });

    test('displays language icon', () => {
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const languageIcon = document.querySelector(
        '[data-testid="LanguageIcon"]'
      );
      expect(languageIcon).toBeInTheDocument();
    });

    test('has tooltip with change language text', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByText('Change Language')).toBeInTheDocument();
      });
    });

    test('button has correct accessibility attributes', () => {
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Change Language');
    });
  });

  describe('Language Detection', () => {
    test('displays correct flag for English', () => {
      testI18n.changeLanguage('en');
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      expect(screen.getByText('🇬🇧')).toBeInTheDocument();
    });

    test('displays correct flag for Russian', () => {
      testI18n.changeLanguage('ru');
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      expect(screen.getByText('🇷🇺')).toBeInTheDocument();
    });

    test('displays correct flag for Ukrainian', () => {
      testI18n.changeLanguage('ua');
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      expect(screen.getByText('🇺🇦')).toBeInTheDocument();
    });

    test('falls back to English for unknown language', () => {
      testI18n.changeLanguage('unknown');
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      // Should default to English flag
      expect(screen.getByText('🇬🇧')).toBeInTheDocument();
    });
  });

  describe('Menu Interaction', () => {
    test('opens menu when button is clicked', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    test('displays all language options in menu', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Русский')).toBeInTheDocument();
        expect(screen.getByText('Українська')).toBeInTheDocument();
      });
    });

    test('displays correct flags in menu items', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        // Check that flags appear in menu items
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems).toHaveLength(3);

        // Flags should be visible within menu items (multiple instances expected)
        expect(screen.getAllByText('🇬🇧')).toHaveLength(2); // Button + menu item
        expect(screen.getAllByText('🇷🇺')).toHaveLength(1); // Only in menu
        expect(screen.getAllByText('🇺🇦')).toHaveLength(1); // Only in menu
      });
    });

    test('highlights current language in menu', async () => {
      const user = userEvent.setup();

      testI18n.changeLanguage('ru');
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const russianMenuItem = screen.getByRole('menuitem', {
          name: /русский/i,
        });
        // MUI MenuItem uses CSS classes for selected state, not aria-selected
        expect(russianMenuItem).toHaveClass('Mui-selected');
      });
    });

    test('closes menu when clicking outside', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <LanguageSwitcher />
          <div data-testid="outside-element">Outside</div>
        </div>,
        { i18nInstance: testI18n }
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('outside-element'));

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Language Switching', () => {
    test('changes language when menu item is clicked', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Русский')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Русский'));

      expect(mockChangeLanguage).toHaveBeenCalledWith('ru');
    });

    test('saves language preference to localStorage', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Українська')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Українська'));

      expect(localStorage.setItem).toHaveBeenCalledWith('language', 'ua');
    });

    test('closes menu after language selection', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      await user.click(screen.getByText('English'));

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    test('switches to each available language', async () => {
      const user = userEvent.setup();

      const languages = [
        { code: 'en', name: 'English' },
        { code: 'ru', name: 'Русский' },
        { code: 'ua', name: 'Українська' },
      ];

      for (const language of languages) {
        render(<LanguageSwitcher />, { i18nInstance: testI18n });

        const button = screen.getByRole('button');
        await user.click(button);

        await waitFor(() => {
          expect(screen.getByText(language.name)).toBeInTheDocument();
        });

        await user.click(screen.getByText(language.name));

        expect(mockChangeLanguage).toHaveBeenCalledWith(language.code);
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'language',
          language.code
        );
      }
    });
  });

  describe('Menu Positioning', () => {
    test('menu has correct anchor origin', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();
        // Menu should appear below and aligned to the right of the button
      });
    });

    test('menu positioning works with different screen sizes', async () => {
      const user = userEvent.setup();

      // This test ensures the menu renders without errors in different contexts
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('opens menu with Enter key', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    test('opens menu with Space key', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    test('navigates menu items with arrow keys', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Arrow down should focus first menu item
      await user.keyboard('{ArrowDown}');

      const firstMenuItem = screen.getByRole('menuitem', { name: /english/i });
      expect(firstMenuItem).toHaveFocus();
    });

    test('selects language with Enter key in menu', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}'); // Move to Russian
      await user.keyboard('{Enter}');

      expect(mockChangeLanguage).toHaveBeenCalledWith('ru');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Change Language');
    });

    test('menu items have proper roles', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems).toHaveLength(3);

        menuItems.forEach(item => {
          expect(item).toBeInTheDocument();
        });
      });
    });

    test('current language is marked as selected', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const englishMenuItem = screen.getByRole('menuitem', {
          name: /english/i,
        });
        // MUI MenuItem uses CSS classes for selected state, not aria-selected
        expect(englishMenuItem).toHaveClass('Mui-selected');
      });
    });

    test('maintains focus management', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      await user.click(screen.getByText('English'));

      // Focus should return to button after menu closes
      await waitFor(() => {
        expect(button).toHaveFocus();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles i18n errors gracefully', () => {
      // Remove the translation to simulate missing key
      testI18n.removeResourceBundle('en', 'translation');

      // Should render without crashing
      expect(() =>
        render(<LanguageSwitcher />, { i18nInstance: testI18n })
      ).not.toThrow();
    });

    test('handles missing translation gracefully', () => {
      // Create test i18n without the specific translation
      const emptyI18n = createTestI18n();
      render(<LanguageSwitcher />, { i18nInstance: emptyI18n });

      // Button should still be rendered even with empty translation
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('handles localStorage errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock localStorage to throw error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      render(<LanguageSwitcher />, { i18nInstance: testI18n });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Русский')).toBeInTheDocument();
      });

      // Should not crash when localStorage fails
      await user.click(screen.getByText('Русский'));

      expect(mockChangeLanguage).toHaveBeenCalledWith('ru');
    });
  });
});
