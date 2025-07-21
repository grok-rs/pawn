import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createMockPlayer } from '../utils/test-utils';

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock components for accessibility testing
const MockDataTable = ({ data, columns, loading = false }: any) => (
  <div role="region" aria-label="Tournament data table">
    <table role="table" aria-label="Players table">
      <thead>
        <tr>
          {columns.map((col: any) => (
            <th
              key={col.key}
              scope="col"
              aria-sort={col.sortable ? 'none' : undefined}
              tabIndex={col.sortable ? 0 : -1}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length}>
              <div role="status" aria-live="polite" aria-label="Loading data">
                Loading...
              </div>
            </td>
          </tr>
        ) : (
          data.map((item: any, index: number) => (
            <tr key={item.id} aria-rowindex={index + 2}>
              {columns.map((col: any) => (
                <td key={`${item.id}-${col.key}`}>{item[col.key]}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const MockFormComponent = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    rating: '',
    email: '',
    country: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>Player Information</legend>

        <div className="form-field">
          <label htmlFor="player-name">
            Full Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="player-name"
            type="text"
            value={formData.name}
            onChange={e =>
              setFormData(prev => ({ ...prev, name: e.target.value }))
            }
            aria-required="true"
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <div
              id="name-error"
              role="alert"
              aria-live="polite"
              className="error-message"
            >
              {errors.name}
            </div>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="player-rating">Chess Rating</label>
          <input
            id="player-rating"
            type="number"
            min="100"
            max="3500"
            value={formData.rating}
            onChange={e =>
              setFormData(prev => ({ ...prev, rating: e.target.value }))
            }
            aria-describedby="rating-help"
          />
          <div id="rating-help" className="help-text">
            Standard FIDE rating (100-3500)
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="player-email">
            Email Address <span aria-hidden="true">*</span>
          </label>
          <input
            id="player-email"
            type="email"
            value={formData.email}
            onChange={e =>
              setFormData(prev => ({ ...prev, email: e.target.value }))
            }
            aria-required="true"
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <div
              id="email-error"
              role="alert"
              aria-live="polite"
              className="error-message"
            >
              {errors.email}
            </div>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="player-country">Country</label>
          <select
            id="player-country"
            value={formData.country}
            onChange={e =>
              setFormData(prev => ({ ...prev, country: e.target.value }))
            }
          >
            <option value="">Select a country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="UK">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
          </select>
        </div>
      </fieldset>

      <div className="form-actions">
        <button
          type="button"
          onClick={() =>
            setFormData({ name: '', rating: '', email: '', country: '' })
          }
        >
          Clear Form
        </button>
        <button type="submit">Save Player</button>
      </div>
    </form>
  );
};

const MockNavigationMenu = ({ currentPage }: { currentPage: string }) => (
  <nav role="navigation" aria-label="Main navigation">
    <ul>
      <li>
        <a
          href="/tournaments"
          aria-current={currentPage === 'tournaments' ? 'page' : undefined}
          className={currentPage === 'tournaments' ? 'current' : ''}
        >
          Tournaments
        </a>
      </li>
      <li>
        <a
          href="/players"
          aria-current={currentPage === 'players' ? 'page' : undefined}
          className={currentPage === 'players' ? 'current' : ''}
        >
          Players
        </a>
      </li>
      <li>
        <a
          href="/settings"
          aria-current={currentPage === 'settings' ? 'page' : undefined}
          className={currentPage === 'settings' ? 'current' : ''}
        >
          Settings
        </a>
      </li>
    </ul>
  </nav>
);

const MockModal = ({ isOpen, onClose, title, children }: any) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus trap would be implemented here
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="modal-close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

const MockAlert = ({
  type,
  message,
  onClose,
}: {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onClose: () => void;
}) => (
  <div
    role="alert"
    aria-live={type === 'error' ? 'assertive' : 'polite'}
    className={`alert alert-${type}`}
  >
    <span className="alert-message">{message}</span>
    <button
      type="button"
      onClick={onClose}
      aria-label="Dismiss alert"
      className="alert-close"
    >
      ×
    </button>
  </div>
);

describe('WCAG Accessibility Compliance Tests', () => {
  describe('WCAG 2.1 Level AA Compliance', () => {
    test('should pass axe accessibility audit for data table', async () => {
      const mockData = [
        createMockPlayer({ id: 1, name: 'Alice Johnson', rating: 1650 }),
        createMockPlayer({ id: 2, name: 'Bob Smith', rating: 1580 }),
        createMockPlayer({ id: 3, name: 'Charlie Brown', rating: 1720 }),
      ];

      const columns = [
        { key: 'name', label: 'Player Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
        { key: 'email', label: 'Email', sortable: false },
      ];

      const { container } = render(
        <MockDataTable data={mockData} columns={columns} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass axe accessibility audit for form components', async () => {
      const { container } = render(<MockFormComponent onSubmit={() => {}} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass axe accessibility audit for navigation', async () => {
      const { container } = render(
        <MockNavigationMenu currentPage="tournaments" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass axe accessibility audit for modal dialogs', async () => {
      const { container } = render(
        <MockModal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content here</p>
        </MockModal>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass axe accessibility audit for alert messages', async () => {
      const { container } = render(
        <div>
          <MockAlert
            type="error"
            message="An error occurred"
            onClose={() => {}}
          />
          <MockAlert
            type="success"
            message="Operation successful"
            onClose={() => {}}
          />
          <MockAlert
            type="warning"
            message="Please check your input"
            onClose={() => {}}
          />
          <MockAlert
            type="info"
            message="Additional information"
            onClose={() => {}}
          />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support tab navigation through form elements', async () => {
      const user = userEvent.setup();
      render(<MockFormComponent onSubmit={() => {}} />);

      const nameInput = screen.getByLabelId('player-name');
      const ratingInput = screen.getByLabelId('player-rating');
      const emailInput = screen.getByLabelId('player-email');
      const countrySelect = screen.getByLabelId('player-country');

      // Tab through form elements
      await user.tab();
      expect(nameInput).toHaveFocus();

      await user.tab();
      expect(ratingInput).toHaveFocus();

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(countrySelect).toHaveFocus();
    });

    test('should support keyboard interaction with sortable table headers', async () => {
      const user = userEvent.setup();
      const mockData = [
        createMockPlayer({ name: 'Test Player', rating: 1500 }),
      ];
      const columns = [
        { key: 'name', label: 'Player Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
      ];

      render(<MockDataTable data={mockData} columns={columns} />);

      const nameHeader = screen.getByText('Player Name');
      const ratingHeader = screen.getByText('Rating');

      // Tab to headers
      await user.tab();
      expect(nameHeader).toHaveFocus();

      // Test Enter key activation
      await user.keyboard('{Enter}');
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

      await user.tab();
      expect(ratingHeader).toHaveFocus();

      // Test Space key activation
      await user.keyboard(' ');
      expect(ratingHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    test('should support keyboard navigation in modal dialogs', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <MockModal
          isOpen={true}
          onClose={mockOnClose}
          title="Keyboard Test Modal"
        >
          <button>First Button</button>
          <input type="text" placeholder="Test input" />
          <button>Last Button</button>
        </MockModal>
      );

      // Modal should be focused
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Escape key should close modal
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should support arrow key navigation in dropdown menus', async () => {
      const user = userEvent.setup();

      const DropdownMenu = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [selectedIndex, setSelectedIndex] = React.useState(-1);
        const options = ['Option 1', 'Option 2', 'Option 3'];

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % options.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev =>
              prev <= 0 ? options.length - 1 : prev - 1
            );
          } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            setIsOpen(false);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        };

        return (
          <div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              onKeyDown={handleKeyDown}
            >
              Select Option
            </button>
            {isOpen && (
              <ul role="listbox" onKeyDown={handleKeyDown} tabIndex={-1}>
                {options.map((option, index) => (
                  <li
                    key={option}
                    role="option"
                    aria-selected={selectedIndex === index}
                    className={selectedIndex === index ? 'selected' : ''}
                  >
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      };

      render(<DropdownMenu />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      const listbox = screen.getByRole('listbox');
      listbox.focus();

      // Arrow down should select first option
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Option 1' })).toHaveAttribute(
        'aria-selected',
        'true'
      );

      // Arrow down again should select second option
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Option 2' })).toHaveAttribute(
        'aria-selected',
        'true'
      );

      // Arrow up should go back to first option
      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('option', { name: 'Option 1' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('Screen Reader Support', () => {
    test('should provide proper ARIA labels for interactive elements', () => {
      const mockData = [createMockPlayer({ name: 'Test Player' })];
      const columns = [{ key: 'name', label: 'Player Name', sortable: true }];

      render(<MockDataTable data={mockData} columns={columns} />);

      // Check table has proper ARIA labels
      expect(screen.getByRole('table')).toHaveAttribute(
        'aria-label',
        'Players table'
      );
      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Tournament data table'
      );
    });

    test('should announce loading states to screen readers', () => {
      const columns = [{ key: 'name', label: 'Player Name' }];

      render(<MockDataTable data={[]} columns={columns} loading={true} />);

      const loadingIndicator = screen.getByRole('status');
      expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
      expect(loadingIndicator).toHaveAttribute('aria-label', 'Loading data');
      expect(loadingIndicator).toHaveTextContent('Loading...');
    });

    test('should provide proper form field descriptions', () => {
      render(<MockFormComponent onSubmit={() => {}} />);

      const ratingInput = screen.getByLabelId('player-rating');
      expect(ratingInput).toHaveAttribute('aria-describedby', 'rating-help');

      const helpText = screen.getByText('Standard FIDE rating (100-3500)');
      expect(helpText).toHaveAttribute('id', 'rating-help');
    });

    test('should announce form validation errors', async () => {
      const user = userEvent.setup();
      render(<MockFormComponent onSubmit={() => {}} />);

      const submitButton = screen.getByRole('button', { name: 'Save Player' });
      await user.click(submitButton);

      // Check error announcements
      const nameError = screen.getByRole('alert', {
        name: /name is required/i,
      });
      expect(nameError).toHaveAttribute('aria-live', 'polite');

      const emailError = screen.getByRole('alert', {
        name: /email is required/i,
      });
      expect(emailError).toHaveAttribute('aria-live', 'polite');
    });

    test('should provide proper landmark roles', () => {
      render(<MockNavigationMenu currentPage="tournaments" />);

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
    });
  });

  describe('Focus Management', () => {
    test('should maintain focus within modal when opened', async () => {
      const user = userEvent.setup();

      const ModalTest = () => {
        const [isOpen, setIsOpen] = React.useState(false);

        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <MockModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              title="Focus Test"
            >
              <button>Modal Button 1</button>
              <button>Modal Button 2</button>
            </MockModal>
          </div>
        );
      };

      render(<ModalTest />);

      const openButton = screen.getByText('Open Modal');
      await user.click(openButton);

      // Focus should be trapped within modal
      const modalButton1 = screen.getByText('Modal Button 1');
      const modalButton2 = screen.getByText('Modal Button 2');
      const closeButton = screen.getByLabelText('Close dialog');

      modalButton1.focus();
      expect(modalButton1).toHaveFocus();

      await user.tab();
      expect(modalButton2).toHaveFocus();

      await user.tab();
      expect(closeButton).toHaveFocus();
    });

    test('should restore focus when modal is closed', async () => {
      const user = userEvent.setup();

      const ModalTest = () => {
        const [isOpen, setIsOpen] = React.useState(false);

        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <MockModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              title="Focus Test"
            >
              <p>Modal content</p>
            </MockModal>
          </div>
        );
      };

      render(<ModalTest />);

      const openButton = screen.getByText('Open Modal');
      openButton.focus();
      await user.click(openButton);

      const closeButton = screen.getByLabelText('Close dialog');
      await user.click(closeButton);

      // Focus should return to the trigger button
      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should not rely solely on color to convey information', () => {
      render(
        <div>
          <MockAlert
            type="error"
            message="Error: Operation failed"
            onClose={() => {}}
          />
          <MockAlert
            type="success"
            message="Success: Operation completed"
            onClose={() => {}}
          />
          <MockAlert
            type="warning"
            message="Warning: Check your input"
            onClose={() => {}}
          />
        </div>
      );

      // Alerts should include text indicators, not just colors
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/success:/i)).toBeInTheDocument();
      expect(screen.getByText(/warning:/i)).toBeInTheDocument();
    });

    test('should provide text alternatives for important visual elements', () => {
      const StatusIndicator = ({
        status,
      }: {
        status: 'active' | 'inactive' | 'error';
      }) => (
        <div>
          <span
            className={`status-dot status-${status}`}
            aria-hidden="true"
          ></span>
          <span className="sr-only">
            Status:{' '}
            {status === 'active'
              ? 'Online'
              : status === 'inactive'
                ? 'Offline'
                : 'Error'}
          </span>
          Tournament Status
        </div>
      );

      render(<StatusIndicator status="active" />);

      // Visual indicator should have text alternative
      expect(screen.getByText('Status: Online')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Accessibility', () => {
    test('should maintain accessibility at different viewport sizes', async () => {
      const ResponsiveComponent = () => {
        const [isMobile, setIsMobile] = React.useState(false);

        React.useEffect(() => {
          const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
          };

          handleResize();
          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
          <div>
            {isMobile ? (
              <button aria-label="Open navigation menu" aria-expanded="false">
                ☰
              </button>
            ) : (
              <MockNavigationMenu currentPage="tournaments" />
            )}
          </div>
        );
      };

      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true,
      });

      const { container, rerender } = render(<ResponsiveComponent />);
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(
          screen.getByLabelText('Open navigation menu')
        ).toBeInTheDocument();
      });

      let results = await axe(container);
      expect(results).toHaveNoViolations();

      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
        configurable: true,
      });

      rerender(<ResponsiveComponent />);
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Dynamic Content Accessibility', () => {
    test('should announce dynamic content changes', async () => {
      const user = userEvent.setup();

      const DynamicContent = () => {
        const [messages, setMessages] = React.useState<string[]>([]);

        const addMessage = () => {
          setMessages(prev => [...prev, `Message ${prev.length + 1} added`]);
        };

        return (
          <div>
            <button onClick={addMessage}>Add Message</button>
            <div aria-live="polite" aria-label="Messages">
              {messages.map((msg, index) => (
                <div key={index}>{msg}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<DynamicContent />);

      const addButton = screen.getByText('Add Message');
      await user.click(addButton);

      // Dynamic content should be announced
      const liveRegion = screen.getByLabelText('Messages');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveTextContent('Message 1 added');
    });
  });
});
