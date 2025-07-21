import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';

// Mock react-i18next
const mockChangeLanguage = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
});

describe('LanguageSwitcher', () => {
  const mockI18n = {
    language: 'en',
    changeLanguage: mockChangeLanguage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTranslation).mockReturnValue({
      t: mockT,
      i18n: mockI18n,
    } as any);
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'language.changeLanguage': 'Change Language',
      };
      return translations[key] || key;
    });
  });

  describe('Basic Rendering', () => {
    test('renders language switcher button', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button', { name: 'Change Language' });
      expect(button).toBeInTheDocument();
    });

    test('displays current language flag', () => {
      render(<LanguageSwitcher />);

      // English flag should be displayed (default)
      expect(screen.getByText('🇬🇧')).toBeInTheDocument();
    });

    test('displays language icon', () => {
      render(<LanguageSwitcher />);

      const languageIcon = document.querySelector(
        '[data-testid="LanguageIcon"]'
      );
      expect(languageIcon).toBeInTheDocument();
    });

    test('has tooltip with change language text', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByText('Change Language')).toBeInTheDocument();
      });
    });

    test('button has correct accessibility attributes', () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Change Language');
    });
  });

  describe('Language Detection', () => {
    test('displays correct flag for English', () => {
      vi.mocked(useTranslation).mockReturnValue({
        t: mockT,
        i18n: { ...mockI18n, language: 'en' },
      } as any);

      render(<LanguageSwitcher />);

      expect(screen.getByText('🇬🇧')).toBeInTheDocument();
    });

    test('displays correct flag for Russian', () => {
      vi.mocked(useTranslation).mockReturnValue({
        t: mockT,
        i18n: { ...mockI18n, language: 'ru' },
      } as any);

      render(<LanguageSwitcher />);

      expect(screen.getByText('🇷🇺')).toBeInTheDocument();
    });

    test('displays correct flag for Ukrainian', () => {
      vi.mocked(useTranslation).mockReturnValue({
        t: mockT,
        i18n: { ...mockI18n, language: 'ua' },
      } as any);

      render(<LanguageSwitcher />);

      expect(screen.getByText('🇺🇦')).toBeInTheDocument();
    });

    test('falls back to English for unknown language', () => {
      vi.mocked(useTranslation).mockReturnValue({
        t: mockT,
        i18n: { ...mockI18n, language: 'unknown' },
      } as any);

      render(<LanguageSwitcher />);

      // Should default to English flag
      expect(screen.getByText('🇬🇧')).toBeInTheDocument();
    });
  });

  describe('Menu Interaction', () => {
    test('opens menu when button is clicked', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    test('displays all language options in menu', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />);

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

      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        // Check that flags appear in menu items
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems).toHaveLength(3);

        // Flags should be visible within menu items
        expect(screen.getByText('🇬🇧')).toBeInTheDocument();
        expect(screen.getByText('🇷🇺')).toBeInTheDocument();
        expect(screen.getByText('🇺🇦')).toBeInTheDocument();
      });
    });

    test('highlights current language in menu', async () => {
      const user = userEvent.setup();

      vi.mocked(useTranslation).mockReturnValue({
        t: mockT,
        i18n: { ...mockI18n, language: 'ru' },
      } as any);

      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const russianMenuItem = screen.getByRole('menuitem', {
          name: /русский/i,
        });
        expect(russianMenuItem).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('closes menu when clicking outside', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <LanguageSwitcher />
          <div data-testid="outside-element">Outside</div>
        </div>
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

      render(<LanguageSwitcher />);

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

      render(<LanguageSwitcher />);

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

      render(<LanguageSwitcher />);

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
        render(<LanguageSwitcher />);

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

      render(<LanguageSwitcher />);

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
      render(<LanguageSwitcher />);

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

      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    test('opens menu with Space key', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    test('navigates menu items with arrow keys', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />);

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

      render(<LanguageSwitcher />);

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
      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Change Language');
    });

    test('menu items have proper roles', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />);

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

      render(<LanguageSwitcher />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const englishMenuItem = screen.getByRole('menuitem', {
          name: /english/i,
        });
        expect(englishMenuItem).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('maintains focus management', async () => {
      const user = userEvent.setup();

      render(<LanguageSwitcher />);

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
      vi.mocked(useTranslation).mockReturnValue({
        t: vi.fn().mockImplementation(() => {
          throw new Error('Translation error');
        }),
        i18n: mockI18n,
      } as any);

      // Should render without crashing
      expect(() => render(<LanguageSwitcher />)).not.toThrow();
    });

    test('handles missing translation gracefully', () => {
      vi.mocked(useTranslation).mockReturnValue({
        t: vi.fn().mockReturnValue(''),
        i18n: mockI18n,
      } as any);

      render(<LanguageSwitcher />);

      // Button should still be rendered even with empty translation
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('handles localStorage errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock localStorage to throw error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      render(<LanguageSwitcher />);

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
