import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Advanced schema validation utilities
const DataValidationUtils = {
  // FIDE title validation
  validateFIDETitle: (title: string): { valid: boolean; errors: string[] } => {
    const validTitles = [
      '',
      'CM',
      'FM',
      'IM',
      'GM',
      'WCM',
      'WFM',
      'WIM',
      'WGM',
    ];
    const errors: string[] = [];

    if (!validTitles.includes(title)) {
      errors.push(
        `Invalid FIDE title: ${title}. Must be one of: ${validTitles.join(', ')}`
      );
    }

    return { valid: errors.length === 0, errors };
  },

  // Chess rating validation with realistic constraints
  validateChessRating: (
    rating: number,
    system: 'FIDE' | 'USCF' | 'ECF' = 'FIDE'
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Basic range validation
    if (rating < 0 || rating > 3500) {
      errors.push(`Rating ${rating} is outside valid range (0-3500)`);
    }

    // System-specific validation
    switch (system) {
      case 'FIDE':
        if (rating > 0 && rating < 1000) {
          errors.push(
            'FIDE ratings below 1000 are extremely rare and should be verified'
          );
        }
        if (rating > 2900) {
          errors.push(
            'FIDE ratings above 2900 are exceptional and should be verified'
          );
        }
        break;
      case 'USCF':
        if (rating > 0 && rating < 100) {
          errors.push('USCF ratings below 100 are unusual');
        }
        if (rating > 3000) {
          errors.push('USCF ratings above 3000 are exceptional');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  },

  // Tournament format validation
  validateTournamentFormat: (
    format: string,
    playerCount: number,
    rounds: number
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const validFormats = ['swiss', 'round_robin', 'knockout', 'team_swiss'];

    if (!validFormats.includes(format)) {
      errors.push(`Invalid tournament format: ${format}`);
      return { valid: false, errors };
    }

    switch (format) {
      case 'round_robin': {
        const maxRoundRobin = playerCount - 1;
        if (rounds > maxRoundRobin) {
          errors.push(
            `Round robin with ${playerCount} players cannot have more than ${maxRoundRobin} rounds`
          );
        }
        if (playerCount > 20) {
          errors.push(
            'Round robin tournaments with more than 20 players are impractical'
          );
        }
        break;
      }

      case 'knockout': {
        const maxKnockoutRounds = Math.ceil(Math.log2(playerCount));
        if (rounds > maxKnockoutRounds) {
          errors.push(
            `Knockout with ${playerCount} players cannot have more than ${maxKnockoutRounds} rounds`
          );
        }
        if (playerCount < 4) {
          errors.push('Knockout tournaments need at least 4 players');
        }
        break;
      }

      case 'swiss':
        if (rounds > Math.ceil(Math.log2(playerCount)) + 2) {
          errors.push(
            `Swiss tournament with ${playerCount} players should not exceed ${Math.ceil(Math.log2(playerCount)) + 2} rounds`
          );
        }
        if (rounds < 3) {
          errors.push('Swiss tournaments typically need at least 3 rounds');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  },

  // Time control validation
  validateTimeControl: (
    timeControl: any
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!timeControl || typeof timeControl !== 'object') {
      errors.push('Time control must be an object');
      return { valid: false, errors };
    }

    const { mainTime, increment, type } = timeControl;

    // Main time validation
    if (typeof mainTime !== 'number' || mainTime < 0) {
      errors.push('Main time must be a non-negative number');
    } else {
      if (mainTime === 0 && increment === 0) {
        errors.push('Cannot have zero main time and zero increment');
      }
      if (mainTime > 10800) {
        // 3 hours
        errors.push('Main time exceeding 3 hours is unusual');
      }
    }

    // Increment validation
    if (typeof increment !== 'number' || increment < 0) {
      errors.push('Increment must be a non-negative number');
    } else if (increment > 3600) {
      // 1 hour
      errors.push('Increment exceeding 1 hour is unusual');
    }

    // Type validation
    const validTypes = ['fischer', 'bronstein', 'delay', 'simple'];
    if (!validTypes.includes(type)) {
      errors.push(
        `Invalid time control type: ${type}. Must be one of: ${validTypes.join(', ')}`
      );
    }

    // Logical combinations
    if (type === 'simple' && increment > 0) {
      errors.push('Simple time control should not have increment');
    }

    return { valid: errors.length === 0, errors };
  },

  // Email validation with comprehensive patterns
  validateEmail: (email: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
      return { valid: false, errors };
    }

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    // Length validation
    if (email.length > 254) {
      errors.push('Email address too long (max 254 characters)');
    }

    // Local part validation (before @)
    const [localPart, domain] = email.split('@');
    if (localPart && localPart.length > 64) {
      errors.push('Email local part too long (max 64 characters)');
    }

    // Domain validation
    if (domain) {
      if (domain.length > 253) {
        errors.push('Email domain too long (max 253 characters)');
      }
      if (domain.includes('..')) {
        errors.push('Email domain cannot contain consecutive dots');
      }
      if (domain.startsWith('.') || domain.endsWith('.')) {
        errors.push('Email domain cannot start or end with a dot');
      }
    }

    // Common disposable email patterns
    const disposablePatterns = [
      '10minutemail',
      'guerrillamail',
      'mailinator',
      'tempmail',
      'throwaway',
      'temp-mail',
      'dispostable',
      'fakeinbox',
    ];
    if (
      disposablePatterns.some(pattern => email.toLowerCase().includes(pattern))
    ) {
      errors.push('Disposable email addresses are not recommended');
    }

    return { valid: errors.length === 0, errors };
  },

  // Phone number validation with international support
  validatePhoneNumber: (
    phone: string,
    countryCode?: string
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!phone) {
      return { valid: true, errors }; // Phone is optional
    }

    // Remove common formatting
    const cleanPhone = phone.replace(/[\s\-()+.]/g, '');

    if (!/^\d{7,15}$/.test(cleanPhone)) {
      errors.push('Phone number must contain 7-15 digits');
    }

    // Country-specific validation
    if (countryCode) {
      switch (countryCode.toUpperCase()) {
        case 'US':
          if (!/^1?\d{10}$/.test(cleanPhone)) {
            errors.push(
              'US phone number must be 10 digits (with optional country code)'
            );
          }
          break;
        case 'UK':
          if (!/^44?\d{10}$/.test(cleanPhone)) {
            errors.push('UK phone number format invalid');
          }
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  },

  // Date validation with chess context
  validateBirthDate: (
    birthDate: string
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!birthDate) {
      return { valid: true, errors }; // Birth date is optional
    }

    // Format validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      errors.push('Birth date must be in YYYY-MM-DD format');
      return { valid: false, errors };
    }

    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid birth date');
      return { valid: false, errors };
    }

    // Age validation for chess context
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      const adjustedAge = age - 1;
      if (adjustedAge < 5) {
        errors.push(
          'Player must be at least 5 years old for rated tournaments'
        );
      }
    } else if (age < 5) {
      errors.push('Player must be at least 5 years old for rated tournaments');
    }

    if (age > 120) {
      errors.push('Please verify birth date - age appears unusually high');
    }

    if (date > today) {
      errors.push('Birth date cannot be in the future');
    }

    return { valid: errors.length === 0, errors };
  },

  // Comprehensive player data validation
  validatePlayerData: (
    playerData: any
  ): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    const requiredFields = ['name', 'rating', 'email'];
    for (const field of requiredFields) {
      if (!playerData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Individual field validations
    const nameValidation = DataValidationUtils.validateName(playerData.name);
    errors.push(...nameValidation.errors);

    const ratingValidation = DataValidationUtils.validateChessRating(
      playerData.rating
    );
    errors.push(...ratingValidation.errors);

    const emailValidation = DataValidationUtils.validateEmail(playerData.email);
    errors.push(...emailValidation.errors);

    if (playerData.title) {
      const titleValidation = DataValidationUtils.validateFIDETitle(
        playerData.title
      );
      errors.push(...titleValidation.errors);
    }

    if (playerData.phone) {
      const phoneValidation = DataValidationUtils.validatePhoneNumber(
        playerData.phone,
        playerData.countryCode
      );
      errors.push(...phoneValidation.errors);
    }

    if (playerData.birthDate) {
      const birthDateValidation = DataValidationUtils.validateBirthDate(
        playerData.birthDate
      );
      errors.push(...birthDateValidation.errors);
    }

    // Cross-field validation
    if (playerData.title && playerData.rating) {
      const titleRatingWarnings =
        DataValidationUtils.validateTitleRatingConsistency(
          playerData.title,
          playerData.rating
        );
      warnings.push(...titleRatingWarnings);
    }

    if (playerData.fideId && !/^\d{8,10}$/.test(playerData.fideId)) {
      errors.push('FIDE ID must be 8-10 digits');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  // Name validation
  validateName: (name: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!name || typeof name !== 'string') {
      errors.push('Name is required');
      return { valid: false, errors };
    }

    if (name.trim() !== name) {
      errors.push('Name cannot have leading or trailing whitespace');
    }

    if (name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-ZÀ-ÿĀ-žА-я\s\-'.]+$/.test(name)) {
      errors.push('Name contains invalid characters');
    }

    // Check for reasonable format
    if (/^\s+|\s+$/.test(name)) {
      errors.push('Name cannot start or end with spaces');
    }

    if (/\s{2,}/.test(name)) {
      errors.push('Name cannot contain multiple consecutive spaces');
    }

    return { valid: errors.length === 0, errors };
  },

  // Title-rating consistency validation
  validateTitleRatingConsistency: (title: string, rating: number): string[] => {
    const warnings: string[] = [];

    const titleMinRatings = {
      GM: 2500,
      IM: 2400,
      FM: 2300,
      CM: 2200,
      WGM: 2300,
      WIM: 2200,
      WFM: 2100,
      WCM: 2000,
    };

    const minRating = titleMinRatings[title as keyof typeof titleMinRatings];
    if (minRating && rating < minRating - 200) {
      warnings.push(
        `Rating ${rating} is unusually low for title ${title} (typical minimum ~${minRating})`
      );
    }

    if (title === '' && rating > 2400) {
      warnings.push(
        `Rating ${rating} is high for a player without a FIDE title`
      );
    }

    return warnings;
  },

  // Bulk validation for imports
  validateBulkPlayerData: (
    playersData: any[]
  ): {
    valid: boolean;
    results: Array<{
      index: number;
      valid: boolean;
      errors: string[];
      warnings: string[];
    }>;
  } => {
    if (!Array.isArray(playersData)) {
      return {
        valid: false,
        results: [
          {
            index: -1,
            valid: false,
            errors: ['Input must be an array'],
            warnings: [],
          },
        ],
      };
    }

    const results = playersData.map((playerData, index) => ({
      index,
      ...DataValidationUtils.validatePlayerData(playerData),
    }));

    const allValid = results.every(result => result.valid);
    return { valid: allValid, results };
  },
};

// Test component that demonstrates data validation
const DataValidationTestComponent = ({
  validationMode = 'player',
  testData = null,
}: {
  validationMode?: 'player' | 'tournament' | 'timeControl';
  testData?: any;
}) => {
  const [data, setData] = React.useState(
    testData || {
      name: '',
      rating: '',
      email: '',
      title: '',
      phone: '',
      birthDate: '',
    }
  );

  const [validationResult, setValidationResult] = React.useState<any>(null);

  const handleValidate = () => {
    let result;

    switch (validationMode) {
      case 'player':
        result = DataValidationUtils.validatePlayerData({
          ...data,
          rating: parseInt(data.rating) || 0,
        });
        break;
      case 'tournament':
        result = DataValidationUtils.validateTournamentFormat(
          data.format,
          parseInt(data.playerCount) || 0,
          parseInt(data.rounds) || 0
        );
        break;
      case 'timeControl':
        result = DataValidationUtils.validateTimeControl(data);
        break;
      default:
        result = {
          valid: false,
          errors: ['Unknown validation mode'],
          warnings: [],
        };
    }

    setValidationResult(result);
  };

  React.useEffect(() => {
    if (testData) {
      handleValidate();
    }
  }, [testData]);

  const handleInputChange = (field: string, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div data-testid="data-validation-component">
      {validationMode === 'player' && (
        <div data-testid="player-validation-form">
          <input
            data-testid="name-input"
            placeholder="Name"
            value={data.name}
            onChange={e => handleInputChange('name', e.target.value)}
          />
          <input
            data-testid="rating-input"
            placeholder="Rating"
            value={data.rating}
            onChange={e => handleInputChange('rating', e.target.value)}
          />
          <input
            data-testid="email-input"
            placeholder="Email"
            value={data.email}
            onChange={e => handleInputChange('email', e.target.value)}
          />
          <select
            data-testid="title-select"
            value={data.title}
            onChange={e => handleInputChange('title', e.target.value)}
          >
            <option value="">No Title</option>
            <option value="CM">CM</option>
            <option value="FM">FM</option>
            <option value="IM">IM</option>
            <option value="GM">GM</option>
          </select>
        </div>
      )}

      <button data-testid="validate-button" onClick={handleValidate}>
        Validate
      </button>

      {validationResult && (
        <div data-testid="validation-result">
          <div data-testid="validation-status">
            Status: {validationResult.valid ? 'Valid' : 'Invalid'}
          </div>

          {validationResult.errors && validationResult.errors.length > 0 && (
            <div data-testid="validation-errors">
              <h4>Errors:</h4>
              <ul>
                {validationResult.errors.map((error: string, index: number) => (
                  <li key={index} data-testid={`error-${index}`}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings &&
            validationResult.warnings.length > 0 && (
              <div data-testid="validation-warnings">
                <h4>Warnings:</h4>
                <ul>
                  {validationResult.warnings.map(
                    (warning: string, index: number) => (
                      <li key={index} data-testid={`warning-${index}`}>
                        {warning}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

// Bulk validation test component
const BulkValidationTestComponent = ({
  playersData,
}: {
  playersData: any[];
}) => {
  const [validationResults, setValidationResults] = React.useState<any>(null);

  React.useEffect(() => {
    const results = DataValidationUtils.validateBulkPlayerData(playersData);
    setValidationResults(results);
  }, [playersData]);

  if (!validationResults) {
    return <div data-testid="bulk-validation-loading">Validating...</div>;
  }

  return (
    <div data-testid="bulk-validation-results">
      <div data-testid="bulk-validation-summary">
        Overall Valid: {validationResults.valid ? 'Yes' : 'No'}
      </div>

      <div data-testid="individual-results">
        {validationResults.results.map((result: any, index: number) => (
          <div key={index} data-testid={`result-${index}`}>
            <div>
              Player {result.index + 1}: {result.valid ? 'Valid' : 'Invalid'}
            </div>
            {result.errors.length > 0 && (
              <div data-testid={`errors-${index}`}>
                Errors: {result.errors.join(', ')}
              </div>
            )}
            {result.warnings.length > 0 && (
              <div data-testid={`warnings-${index}`}>
                Warnings: {result.warnings.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Advanced Data Validation and Schema Tests', () => {
  describe('FIDE Title Validation', () => {
    test('should validate correct FIDE titles', () => {
      const validTitles = [
        '',
        'CM',
        'FM',
        'IM',
        'GM',
        'WCM',
        'WFM',
        'WIM',
        'WGM',
      ];

      validTitles.forEach(title => {
        const result = DataValidationUtils.validateFIDETitle(title);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid FIDE titles', () => {
      const invalidTitles = ['NM', 'SM', 'Master', 'Expert', 'INVALID'];

      invalidTitles.forEach(title => {
        const result = DataValidationUtils.validateFIDETitle(title);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Invalid FIDE title: ${title}. Must be one of: , CM, FM, IM, GM, WCM, WFM, WIM, WGM`
        );
      });
    });
  });

  describe('Chess Rating Validation', () => {
    test('should validate normal rating ranges', () => {
      const validRatings = [1000, 1500, 2000, 2500, 2800];

      validRatings.forEach(rating => {
        const result = DataValidationUtils.validateChessRating(rating);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject ratings outside valid range', () => {
      const invalidRatings = [-100, 4000];

      invalidRatings.forEach(rating => {
        const result = DataValidationUtils.validateChessRating(rating);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('outside valid range');
      });
    });

    test('should warn about unusual FIDE ratings', () => {
      const unusualLowResult = DataValidationUtils.validateChessRating(
        500,
        'FIDE'
      );
      expect(unusualLowResult.valid).toBe(false);
      expect(unusualLowResult.errors[0]).toContain('extremely rare');

      const unusualHighResult = DataValidationUtils.validateChessRating(
        2950,
        'FIDE'
      );
      expect(unusualHighResult.valid).toBe(false);
      expect(unusualHighResult.errors[0]).toContain('exceptional');
    });

    test('should handle different rating systems', () => {
      const uscfResult = DataValidationUtils.validateChessRating(50, 'USCF');
      expect(uscfResult.valid).toBe(false);
      expect(uscfResult.errors[0]).toContain('unusual');

      const normalUSCF = DataValidationUtils.validateChessRating(1500, 'USCF');
      expect(normalUSCF.valid).toBe(true);
    });
  });

  describe('Tournament Format Validation', () => {
    test('should validate Swiss tournament parameters', () => {
      const result = DataValidationUtils.validateTournamentFormat(
        'swiss',
        32,
        5
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid Swiss parameters', () => {
      const tooManyRounds = DataValidationUtils.validateTournamentFormat(
        'swiss',
        16,
        10
      );
      expect(tooManyRounds.valid).toBe(false);
      expect(tooManyRounds.errors[0]).toContain('should not exceed');

      const tooFewRounds = DataValidationUtils.validateTournamentFormat(
        'swiss',
        16,
        1
      );
      expect(tooFewRounds.valid).toBe(false);
      expect(tooFewRounds.errors[0]).toContain('at least 3 rounds');
    });

    test('should validate Round Robin constraints', () => {
      const validRR = DataValidationUtils.validateTournamentFormat(
        'round_robin',
        8,
        7
      );
      expect(validRR.valid).toBe(true);

      const invalidRR = DataValidationUtils.validateTournamentFormat(
        'round_robin',
        8,
        10
      );
      expect(invalidRR.valid).toBe(false);
      expect(invalidRR.errors[0]).toContain('cannot have more than 7 rounds');

      const tooManyPlayers = DataValidationUtils.validateTournamentFormat(
        'round_robin',
        25,
        24
      );
      expect(tooManyPlayers.valid).toBe(false);
      expect(tooManyPlayers.errors[0]).toContain('impractical');
    });

    test('should validate Knockout constraints', () => {
      const validKO = DataValidationUtils.validateTournamentFormat(
        'knockout',
        16,
        4
      );
      expect(validKO.valid).toBe(true);

      const invalidKO = DataValidationUtils.validateTournamentFormat(
        'knockout',
        16,
        6
      );
      expect(invalidKO.valid).toBe(false);
      expect(invalidKO.errors[0]).toContain('cannot have more than 4 rounds');

      const tooFewPlayers = DataValidationUtils.validateTournamentFormat(
        'knockout',
        2,
        1
      );
      expect(tooFewPlayers.valid).toBe(false);
      expect(tooFewPlayers.errors[0]).toContain('at least 4 players');
    });

    test('should reject invalid tournament formats', () => {
      const result = DataValidationUtils.validateTournamentFormat(
        'invalid_format',
        16,
        5
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid tournament format');
    });
  });

  describe('Time Control Validation', () => {
    test('should validate standard time controls', () => {
      const validTimeControls = [
        { mainTime: 90, increment: 30, type: 'fischer' },
        { mainTime: 120, increment: 0, type: 'simple' },
        { mainTime: 180, increment: 2, type: 'bronstein' },
        { mainTime: 15, increment: 10, type: 'fischer' }, // Blitz
      ];

      validTimeControls.forEach(tc => {
        const result = DataValidationUtils.validateTimeControl(tc);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid time control structures', () => {
      const invalidTimeControls = [
        null,
        'not an object',
        {},
        { mainTime: -5, increment: 30, type: 'fischer' },
        { mainTime: 90, increment: -10, type: 'fischer' },
        { mainTime: 90, increment: 30, type: 'invalid_type' },
        { mainTime: 0, increment: 0, type: 'fischer' },
      ];

      invalidTimeControls.forEach(tc => {
        const result = DataValidationUtils.validateTimeControl(tc);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should warn about unusual time controls', () => {
      const unusualLong = DataValidationUtils.validateTimeControl({
        mainTime: 14400, // 4 hours
        increment: 30,
        type: 'fischer',
      });
      expect(unusualLong.valid).toBe(false);
      expect(unusualLong.errors[0]).toContain('unusual');

      const unusualIncrement = DataValidationUtils.validateTimeControl({
        mainTime: 90,
        increment: 3700, // Over 1 hour
        type: 'fischer',
      });
      expect(unusualIncrement.valid).toBe(false);
      expect(unusualIncrement.errors[0]).toContain('unusual');
    });

    test('should validate logical time control combinations', () => {
      const invalidSimple = DataValidationUtils.validateTimeControl({
        mainTime: 120,
        increment: 30, // Simple should not have increment
        type: 'simple',
      });
      expect(invalidSimple.valid).toBe(false);
      expect(invalidSimple.errors[0]).toContain('should not have increment');
    });
  });

  describe('Email Validation', () => {
    test('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        const result = DataValidationUtils.validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'not-an-email',
        '@domain.com',
        'user@',
        'user..double@domain.com',
        'user@domain',
        'user@.domain.com',
        'user@domain.com.',
        'a'.repeat(65) + '@domain.com', // Local part too long
        'user@' + 'a'.repeat(250) + '.com', // Domain too long
      ];

      invalidEmails.forEach(email => {
        const result = DataValidationUtils.validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should warn about disposable email addresses', () => {
      const disposableEmails = [
        'test@10minutemail.com',
        'user@guerrillamail.org',
        'temp@mailinator.com',
      ];

      disposableEmails.forEach(email => {
        const result = DataValidationUtils.validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('Disposable'))).toBe(
          true
        );
      });
    });
  });

  describe('Phone Number Validation', () => {
    test('should handle optional phone numbers', () => {
      const result = DataValidationUtils.validatePhoneNumber('');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate international phone numbers', () => {
      const validPhones = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '15551234567',
        '+44 20 7946 0958',
      ];

      validPhones.forEach(phone => {
        const result = DataValidationUtils.validatePhoneNumber(phone);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123', // Too short
        '12345678901234567890', // Too long
        'not-a-number',
        '+1-abc-def-ghij',
      ];

      invalidPhones.forEach(phone => {
        const result = DataValidationUtils.validatePhoneNumber(phone);
        expect(result.valid).toBe(false);
      });
    });

    test('should validate country-specific formats', () => {
      const usValid = DataValidationUtils.validatePhoneNumber(
        '555-123-4567',
        'US'
      );
      expect(usValid.valid).toBe(true);

      const usInvalid = DataValidationUtils.validatePhoneNumber('123-45', 'US');
      expect(usInvalid.valid).toBe(false);
      expect(usInvalid.errors[0]).toContain('10 digits');
    });
  });

  describe('Birth Date Validation', () => {
    test('should handle optional birth dates', () => {
      const result = DataValidationUtils.validateBirthDate('');
      expect(result.valid).toBe(true);
    });

    test('should validate correct date formats', () => {
      const validDates = ['1990-05-15', '1980-12-01', '2010-01-01'];

      validDates.forEach(date => {
        const result = DataValidationUtils.validateBirthDate(date);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject invalid date formats', () => {
      const invalidDates = [
        '15/05/1990',
        '1990-5-15',
        '1990-13-01',
        '1990-02-30',
        'not-a-date',
      ];

      invalidDates.forEach(date => {
        const result = DataValidationUtils.validateBirthDate(date);
        expect(result.valid).toBe(false);
      });
    });

    test('should validate age constraints for chess', () => {
      const tooYoung = DataValidationUtils.validateBirthDate('2020-01-01');
      expect(tooYoung.valid).toBe(false);
      expect(tooYoung.errors[0]).toContain('at least 5 years old');

      const tooOld = DataValidationUtils.validateBirthDate('1900-01-01');
      expect(tooOld.valid).toBe(false);
      expect(tooOld.errors[0]).toContain('unusually high');

      const future = DataValidationUtils.validateBirthDate('2030-01-01');
      expect(future.valid).toBe(false);
      expect(future.errors[0]).toContain('cannot be in the future');
    });
  });

  describe('Player Name Validation', () => {
    test('should validate correct names', () => {
      const validNames = [
        'John Doe',
        'Marie-Claire Dubois',
        "O'Connor",
        'José María García',
        '李小明',
        'Владимир Петров',
      ];

      validNames.forEach(name => {
        const result = DataValidationUtils.validateName(name);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject invalid names', () => {
      const invalidNames = [
        '',
        'A',
        ' John Doe ',
        'John  Doe',
        'A'.repeat(101),
        'John123',
        'John@Doe',
      ];

      invalidNames.forEach(name => {
        const result = DataValidationUtils.validateName(name);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Title-Rating Consistency Validation', () => {
    test('should warn about inconsistent title-rating combinations', () => {
      const warnings1 = DataValidationUtils.validateTitleRatingConsistency(
        'GM',
        2200
      );
      expect(warnings1.length).toBeGreaterThan(0);
      expect(warnings1[0]).toContain('unusually low');

      const warnings2 = DataValidationUtils.validateTitleRatingConsistency(
        '',
        2500
      );
      expect(warnings2.length).toBeGreaterThan(0);
      expect(warnings2[0]).toContain('high for a player without');
    });

    test('should not warn for consistent combinations', () => {
      const warnings1 = DataValidationUtils.validateTitleRatingConsistency(
        'GM',
        2600
      );
      expect(warnings1).toHaveLength(0);

      const warnings2 = DataValidationUtils.validateTitleRatingConsistency(
        'FM',
        2350
      );
      expect(warnings2).toHaveLength(0);

      const warnings3 = DataValidationUtils.validateTitleRatingConsistency(
        '',
        1800
      );
      expect(warnings3).toHaveLength(0);
    });
  });

  describe('Comprehensive Player Data Validation', () => {
    test('should validate complete valid player data', () => {
      const validPlayer = {
        name: 'Magnus Carlsen',
        rating: 2830,
        email: 'magnus@chess.com',
        title: 'GM',
        phone: '+47 123 45 678',
        birthDate: '1990-11-30',
        countryCode: 'NO',
        fideId: '1503014',
      };

      const result = DataValidationUtils.validatePlayerData(validPlayer);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle missing required fields', () => {
      const incompletePlayer = {
        name: 'Test Player',
        // Missing rating and email
      };

      const result = DataValidationUtils.validatePlayerData(incompletePlayer);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: rating');
      expect(result.errors).toContain('Missing required field: email');
    });

    test('should accumulate multiple validation errors', () => {
      const invalidPlayer = {
        name: 'A', // Too short
        rating: -500, // Invalid
        email: 'not-email', // Invalid format
        title: 'INVALID', // Not a FIDE title
        fideId: '123', // Too short
      };

      const result = DataValidationUtils.validatePlayerData(invalidPlayer);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    test('should provide warnings for suspicious data', () => {
      const suspiciousPlayer = {
        name: 'Test Player',
        rating: 2700,
        email: 'test@example.com',
        title: '', // No title but very high rating
      };

      const result = DataValidationUtils.validatePlayerData(suspiciousPlayer);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('high for a player without');
    });
  });

  describe('Bulk Validation', () => {
    test('should validate multiple players in bulk', () => {
      const playersData = [
        { name: 'Player 1', rating: 1500, email: 'player1@test.com' },
        { name: 'Player 2', rating: 1600, email: 'player2@test.com' },
        { name: 'Player 3', rating: 1550, email: 'player3@test.com' },
      ];

      const result = DataValidationUtils.validateBulkPlayerData(playersData);
      expect(result.valid).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.valid)).toBe(true);
    });

    test('should identify invalid entries in bulk validation', () => {
      const mixedData = [
        { name: 'Valid Player', rating: 1500, email: 'valid@test.com' },
        { name: '', rating: 1600, email: 'invalid-email' }, // Invalid
        { name: 'Another Valid', rating: 1550, email: 'another@test.com' },
      ];

      const result = DataValidationUtils.validateBulkPlayerData(mixedData);
      expect(result.valid).toBe(false);
      expect(result.results[0].valid).toBe(true);
      expect(result.results[1].valid).toBe(false);
      expect(result.results[2].valid).toBe(true);
    });

    test('should handle non-array input', () => {
      const result = DataValidationUtils.validateBulkPlayerData(
        'not an array' as any
      );
      expect(result.valid).toBe(false);
      expect(result.results[0].errors).toContain('Input must be an array');
    });
  });

  describe('Interactive Validation Component Testing', () => {
    test('should validate player data through UI component', async () => {
      const user = userEvent.setup();

      render(<DataValidationTestComponent validationMode="player" />);

      // Fill in valid data
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('rating-input'), '1650');
      await user.type(screen.getByTestId('email-input'), 'john@example.com');
      await user.selectOptions(screen.getByTestId('title-select'), 'FM');

      // Validate
      await user.click(screen.getByTestId('validate-button'));

      await waitFor(() => {
        expect(screen.getByTestId('validation-status')).toHaveTextContent(
          'Status: Valid'
        );
        expect(
          screen.queryByTestId('validation-errors')
        ).not.toBeInTheDocument();
      });
    });

    test('should display validation errors through UI component', async () => {
      const user = userEvent.setup();

      render(<DataValidationTestComponent validationMode="player" />);

      // Fill in invalid data
      await user.type(screen.getByTestId('name-input'), 'A'); // Too short
      await user.type(screen.getByTestId('rating-input'), '-100'); // Invalid
      await user.type(screen.getByTestId('email-input'), 'not-email'); // Invalid

      // Validate
      await user.click(screen.getByTestId('validate-button'));

      await waitFor(() => {
        expect(screen.getByTestId('validation-status')).toHaveTextContent(
          'Status: Invalid'
        );
        expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
        expect(screen.getByTestId('error-0')).toBeInTheDocument();
        expect(screen.getByTestId('error-1')).toBeInTheDocument();
      });
    });

    test('should handle pre-filled validation data', () => {
      const testData = {
        name: 'Magnus Carlsen',
        rating: 2830,
        email: 'magnus@chess.com',
        title: 'GM',
      };

      render(
        <DataValidationTestComponent
          validationMode="player"
          testData={testData}
        />
      );

      expect(screen.getByTestId('validation-result')).toBeInTheDocument();
      expect(screen.getByTestId('validation-status')).toHaveTextContent(
        'Status: Valid'
      );
    });
  });

  describe('Bulk Validation Component Testing', () => {
    test('should display bulk validation results', () => {
      const testData = [
        { name: 'Player 1', rating: 1500, email: 'p1@test.com' },
        { name: 'Invalid', rating: -100, email: 'bad-email' },
        { name: 'Player 3', rating: 1600, email: 'p3@test.com' },
      ];

      render(<BulkValidationTestComponent playersData={testData} />);

      expect(screen.getByTestId('bulk-validation-summary')).toHaveTextContent(
        'Overall Valid: No'
      );
      expect(screen.getByTestId('result-0')).toHaveTextContent(
        'Player 1: Valid'
      );
      expect(screen.getByTestId('result-1')).toHaveTextContent(
        'Player 2: Invalid'
      );
      expect(screen.getByTestId('result-2')).toHaveTextContent(
        'Player 3: Valid'
      );
      expect(screen.getByTestId('errors-1')).toBeInTheDocument();
    });

    test('should handle all valid data in bulk validation', () => {
      const testData = [
        { name: 'Player 1', rating: 1500, email: 'p1@test.com' },
        { name: 'Player 2', rating: 1600, email: 'p2@test.com' },
      ];

      render(<BulkValidationTestComponent playersData={testData} />);

      expect(screen.getByTestId('bulk-validation-summary')).toHaveTextContent(
        'Overall Valid: Yes'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined inputs gracefully', () => {
      expect(() => DataValidationUtils.validatePlayerData(null)).not.toThrow();
      expect(() =>
        DataValidationUtils.validatePlayerData(undefined)
      ).not.toThrow();

      const nullResult = DataValidationUtils.validatePlayerData(null);
      expect(nullResult.valid).toBe(false);
    });

    test('should handle circular references in objects', () => {
      const circularObj: any = { name: 'Test' };
      circularObj.self = circularObj;

      expect(() =>
        DataValidationUtils.validatePlayerData(circularObj)
      ).not.toThrow();
    });

    test('should handle very large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Player ${i}`,
        rating: 1000 + Math.random() * 1000,
        email: `player${i}@test.com`,
      }));

      const startTime = performance.now();
      const result = DataValidationUtils.validateBulkPlayerData(largeDataset);
      const endTime = performance.now();

      expect(result.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
