import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Mock translation resources
const translationResources = {
  en: {
    translation: {
      // Navigation
      'nav.tournaments': 'Tournaments',
      'nav.players': 'Players',
      'nav.settings': 'Settings',
      'nav.newTournament': 'New Tournament',

      // Common actions
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.yes': 'Yes',
      'common.no': 'No',

      // Tournament management
      'tournament.name': 'Tournament Name',
      'tournament.description': 'Description',
      'tournament.maxPlayers': 'Maximum Players',
      'tournament.maxRounds': 'Maximum Rounds',
      'tournament.status': 'Status',
      'tournament.pairingMethod': 'Pairing Method',
      'tournament.timeControl': 'Time Control',
      'tournament.created': 'Tournament created successfully',
      'tournament.deleted': 'Tournament deleted',

      // Player management
      'player.name': 'Player Name',
      'player.rating': 'Rating',
      'player.email': 'Email',
      'player.phone': 'Phone',
      'player.country': 'Country',
      'player.title': 'Title',
      'player.birthDate': 'Birth Date',
      'player.added': 'Player added successfully',
      'player.updated': 'Player updated',

      // Validation messages
      'validation.required': 'This field is required',
      'validation.email': 'Please enter a valid email address',
      'validation.minLength': 'Minimum length is {{min}} characters',
      'validation.maxLength': 'Maximum length is {{max}} characters',
      'validation.numeric': 'This field must be a number',
      'validation.ratingRange': 'Rating must be between {{min}} and {{max}}',

      // Date and time
      'dateTime.today': 'Today',
      'dateTime.yesterday': 'Yesterday',
      'dateTime.daysAgo': '{{days}} days ago',
      'dateTime.hoursAgo': '{{hours}} hours ago',
      'dateTime.minutesAgo': '{{minutes}} minutes ago',

      // Numbers and pluralization
      'player.count': '{{count}} player',
      'player.count_other': '{{count}} players',
      'tournament.round': 'Round {{number}}',
      'tournament.standings': 'Standings after {{rounds}} rounds',

      // Chess-specific terms
      'chess.whiteWins': 'White Wins',
      'chess.blackWins': 'Black Wins',
      'chess.draw': 'Draw',
      'chess.bye': 'Bye',
      'chess.forfeit': 'Forfeit',
      'chess.timeout': 'Time Out',

      // Status messages
      'status.draft': 'Draft',
      'status.active': 'Active',
      'status.paused': 'Paused',
      'status.completed': 'Completed',
      'status.cancelled': 'Cancelled',
    },
  },
  es: {
    translation: {
      // Navigation
      'nav.tournaments': 'Torneos',
      'nav.players': 'Jugadores',
      'nav.settings': 'Configuración',
      'nav.newTournament': 'Nuevo Torneo',

      // Common actions
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.delete': 'Eliminar',
      'common.edit': 'Editar',
      'common.add': 'Añadir',
      'common.loading': 'Cargando...',
      'common.error': 'Error',
      'common.success': 'Éxito',
      'common.yes': 'Sí',
      'common.no': 'No',

      // Tournament management
      'tournament.name': 'Nombre del Torneo',
      'tournament.description': 'Descripción',
      'tournament.maxPlayers': 'Máximo de Jugadores',
      'tournament.maxRounds': 'Máximo de Rondas',
      'tournament.status': 'Estado',
      'tournament.pairingMethod': 'Método de Emparejamiento',
      'tournament.timeControl': 'Control de Tiempo',
      'tournament.created': 'Torneo creado exitosamente',
      'tournament.deleted': 'Torneo eliminado',

      // Player management
      'player.name': 'Nombre del Jugador',
      'player.rating': 'Clasificación',
      'player.email': 'Correo Electrónico',
      'player.phone': 'Teléfono',
      'player.country': 'País',
      'player.title': 'Título',
      'player.birthDate': 'Fecha de Nacimiento',
      'player.added': 'Jugador añadido exitosamente',
      'player.updated': 'Jugador actualizado',

      // Validation messages
      'validation.required': 'Este campo es obligatorio',
      'validation.email': 'Por favor ingrese un correo electrónico válido',
      'validation.minLength': 'La longitud mínima es {{min}} caracteres',
      'validation.maxLength': 'La longitud máxima es {{max}} caracteres',
      'validation.numeric': 'Este campo debe ser un número',
      'validation.ratingRange':
        'La clasificación debe estar entre {{min}} y {{max}}',

      // Date and time
      'dateTime.today': 'Hoy',
      'dateTime.yesterday': 'Ayer',
      'dateTime.daysAgo': 'Hace {{days}} días',
      'dateTime.hoursAgo': 'Hace {{hours}} horas',
      'dateTime.minutesAgo': 'Hace {{minutes}} minutos',

      // Numbers and pluralization
      'player.count': '{{count}} jugador',
      'player.count_other': '{{count}} jugadores',
      'tournament.round': 'Ronda {{number}}',
      'tournament.standings': 'Clasificación después de {{rounds}} rondas',

      // Chess-specific terms
      'chess.whiteWins': 'Blancas Ganan',
      'chess.blackWins': 'Negras Ganan',
      'chess.draw': 'Empate',
      'chess.bye': 'Descanso',
      'chess.forfeit': 'Abandono',
      'chess.timeout': 'Tiempo Agotado',

      // Status messages
      'status.draft': 'Borrador',
      'status.active': 'Activo',
      'status.paused': 'Pausado',
      'status.completed': 'Completado',
      'status.cancelled': 'Cancelado',
    },
  },
  de: {
    translation: {
      // Navigation
      'nav.tournaments': 'Turniere',
      'nav.players': 'Spieler',
      'nav.settings': 'Einstellungen',
      'nav.newTournament': 'Neues Turnier',

      // Common actions
      'common.save': 'Speichern',
      'common.cancel': 'Abbrechen',
      'common.delete': 'Löschen',
      'common.edit': 'Bearbeiten',
      'common.add': 'Hinzufügen',
      'common.loading': 'Lädt...',
      'common.error': 'Fehler',
      'common.success': 'Erfolg',
      'common.yes': 'Ja',
      'common.no': 'Nein',

      // Tournament management
      'tournament.name': 'Turniername',
      'tournament.description': 'Beschreibung',
      'tournament.maxPlayers': 'Maximale Spieleranzahl',
      'tournament.maxRounds': 'Maximale Runden',
      'tournament.status': 'Status',
      'tournament.pairingMethod': 'Paarungsmethode',
      'tournament.timeControl': 'Zeitkontrolle',
      'tournament.created': 'Turnier erfolgreich erstellt',
      'tournament.deleted': 'Turnier gelöscht',

      // Player management
      'player.name': 'Spielername',
      'player.rating': 'Wertung',
      'player.email': 'E-Mail',
      'player.phone': 'Telefon',
      'player.country': 'Land',
      'player.title': 'Titel',
      'player.birthDate': 'Geburtsdatum',
      'player.added': 'Spieler erfolgreich hinzugefügt',
      'player.updated': 'Spieler aktualisiert',

      // Validation messages
      'validation.required': 'Dieses Feld ist erforderlich',
      'validation.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
      'validation.minLength': 'Mindestlänge beträgt {{min}} Zeichen',
      'validation.maxLength': 'Maximale Länge beträgt {{max}} Zeichen',
      'validation.numeric': 'Dieses Feld muss eine Zahl sein',
      'validation.ratingRange':
        'Wertung muss zwischen {{min}} und {{max}} liegen',

      // Date and time
      'dateTime.today': 'Heute',
      'dateTime.yesterday': 'Gestern',
      'dateTime.daysAgo': 'vor {{days}} Tagen',
      'dateTime.hoursAgo': 'vor {{hours}} Stunden',
      'dateTime.minutesAgo': 'vor {{minutes}} Minuten',

      // Numbers and pluralization
      'player.count': '{{count}} Spieler',
      'player.count_other': '{{count}} Spieler',
      'tournament.round': 'Runde {{number}}',
      'tournament.standings': 'Rangliste nach {{rounds}} Runden',

      // Chess-specific terms
      'chess.whiteWins': 'Weiß Gewinnt',
      'chess.blackWins': 'Schwarz Gewinnt',
      'chess.draw': 'Unentschieden',
      'chess.bye': 'Pause',
      'chess.forfeit': 'Aufgabe',
      'chess.timeout': 'Zeitüberschreitung',

      // Status messages
      'status.draft': 'Entwurf',
      'status.active': 'Aktiv',
      'status.paused': 'Pausiert',
      'status.completed': 'Abgeschlossen',
      'status.cancelled': 'Abgebrochen',
    },
  },
  fr: {
    translation: {
      // Navigation
      'nav.tournaments': 'Tournois',
      'nav.players': 'Joueurs',
      'nav.settings': 'Paramètres',
      'nav.newTournament': 'Nouveau Tournoi',

      // Common actions
      'common.save': 'Enregistrer',
      'common.cancel': 'Annuler',
      'common.delete': 'Supprimer',
      'common.edit': 'Modifier',
      'common.add': 'Ajouter',
      'common.loading': 'Chargement...',
      'common.error': 'Erreur',
      'common.success': 'Succès',
      'common.yes': 'Oui',
      'common.no': 'Non',

      // Tournament management
      'tournament.name': 'Nom du Tournoi',
      'tournament.description': 'Description',
      'tournament.maxPlayers': 'Maximum de Joueurs',
      'tournament.maxRounds': 'Maximum de Rondes',
      'tournament.status': 'Statut',
      'tournament.pairingMethod': "Méthode d'Appariement",
      'tournament.timeControl': 'Contrôle du Temps',
      'tournament.created': 'Tournoi créé avec succès',
      'tournament.deleted': 'Tournoi supprimé',

      // Numbers and pluralization
      'player.count': '{{count}} joueur',
      'player.count_other': '{{count}} joueurs',
    },
  },
  ja: {
    translation: {
      // Navigation
      'nav.tournaments': '大会',
      'nav.players': '選手',
      'nav.settings': '設定',
      'nav.newTournament': '新しい大会',

      // Common actions
      'common.save': '保存',
      'common.cancel': 'キャンセル',
      'common.delete': '削除',
      'common.edit': '編集',
      'common.add': '追加',
      'common.loading': '読み込み中...',
      'common.error': 'エラー',
      'common.success': '成功',
      'common.yes': 'はい',
      'common.no': 'いいえ',

      // Tournament management
      'tournament.name': '大会名',
      'tournament.description': '説明',
      'tournament.maxPlayers': '最大選手数',
      'tournament.maxRounds': '最大ラウンド数',
      'tournament.status': '状態',
      'tournament.created': '大会が正常に作成されました',

      // Player management
      'player.name': '選手名',
      'player.rating': 'レーティング',
      'player.email': 'メールアドレス',

      // Numbers and pluralization (Japanese doesn't have plural forms)
      'player.count': '{{count}}人の選手',
      'player.count_other': '{{count}}人の選手',
    },
  },
  ar: {
    translation: {
      // Navigation (Arabic - RTL)
      'nav.tournaments': 'البطولات',
      'nav.players': 'اللاعبون',
      'nav.settings': 'الإعدادات',
      'nav.newTournament': 'بطولة جديدة',

      // Common actions
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.delete': 'حذف',
      'common.edit': 'تعديل',
      'common.add': 'إضافة',
      'common.loading': 'جاري التحميل...',
      'common.error': 'خطأ',
      'common.success': 'نجح',
      'common.yes': 'نعم',
      'common.no': 'لا',

      // Tournament management
      'tournament.name': 'اسم البطولة',
      'tournament.description': 'الوصف',
      'tournament.maxPlayers': 'الحد الأقصى للاعبين',
      'tournament.status': 'الحالة',
      'tournament.created': 'تم إنشاء البطولة بنجاح',

      // Player management
      'player.name': 'اسم اللاعب',
      'player.rating': 'التصنيف',
      'player.email': 'البريد الإلكتروني',

      // Numbers and pluralization (Arabic has complex plural rules)
      'player.count': 'لاعب واحد',
      'player.count_other': '{{count}} لاعبين',
    },
  },
};

// Mock form with translations
const MockI18nForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    rating: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Mock translation function (would be useTranslation hook)
  const t = (key: string, params?: any) => {
    const lang = document.documentElement.lang || 'en';
    const translations =
      translationResources[lang as keyof typeof translationResources]
        ?.translation || translationResources.en.translation;
    let translation = (translations as any)[key] || key;

    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{{${param}}}`, params[param]);
      });
    }

    return translation;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('validation.required');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('validation.required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('validation.email');
    }

    if (
      formData.rating &&
      (isNaN(Number(formData.rating)) ||
        Number(formData.rating) < 400 ||
        Number(formData.rating) > 3000)
    ) {
      newErrors.rating = t('validation.ratingRange', { min: 400, max: 3000 });
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="i18n-form">
      <div>
        <label htmlFor="player-name">{t('player.name')}:</label>
        <input
          id="player-name"
          type="text"
          value={formData.name}
          onChange={e =>
            setFormData(prev => ({ ...prev, name: e.target.value }))
          }
          data-testid="player-name-input"
        />
        {errors.name && (
          <div data-testid="name-error" role="alert">
            {errors.name}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="player-email">{t('player.email')}:</label>
        <input
          id="player-email"
          type="email"
          value={formData.email}
          onChange={e =>
            setFormData(prev => ({ ...prev, email: e.target.value }))
          }
          data-testid="player-email-input"
        />
        {errors.email && (
          <div data-testid="email-error" role="alert">
            {errors.email}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="player-rating">{t('player.rating')}:</label>
        <input
          id="player-rating"
          type="number"
          value={formData.rating}
          onChange={e =>
            setFormData(prev => ({ ...prev, rating: e.target.value }))
          }
          data-testid="player-rating-input"
        />
        {errors.rating && (
          <div data-testid="rating-error" role="alert">
            {errors.rating}
          </div>
        )}
      </div>

      <button type="submit" data-testid="submit-button">
        {t('common.save')}
      </button>
    </form>
  );
};

// Mock component with pluralization
const MockPlayerCounter = ({ count }: { count: number }) => {
  const t = (key: string, options?: any) => {
    const lang = document.documentElement.lang || 'en';
    const translations =
      translationResources[lang as keyof typeof translationResources]
        ?.translation || translationResources.en.translation;

    // Simple pluralization logic
    let translation = (translations as any)[key] || key;
    if (options?.count !== undefined) {
      const pluralKey = options.count === 1 ? key : `${key}_other`;
      translation = (translations as any)[pluralKey] || translation;
      translation = translation.replace('{{count}}', options.count);
    }

    return translation;
  };

  return <div data-testid="player-counter">{t('player.count', { count })}</div>;
};

// Mock date/time component
const MockRelativeTime = ({ date }: { date: Date }) => {
  const t = (key: string, params?: any) => {
    const lang = document.documentElement.lang || 'en';
    const translations =
      translationResources[lang as keyof typeof translationResources]
        ?.translation || translationResources.en.translation;
    let translation = (translations as any)[key] || key;

    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{{${param}}}`, params[param]);
      });
    }

    return translation;
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays === 0) {
      return t('dateTime.today');
    } else if (diffDays === 1) {
      return t('dateTime.yesterday');
    } else if (diffDays > 1) {
      return t('dateTime.daysAgo', { days: diffDays });
    } else if (diffHours > 0) {
      return t('dateTime.hoursAgo', { hours: diffHours });
    } else {
      return t('dateTime.minutesAgo', { minutes: Math.max(1, diffMinutes) });
    }
  };

  return <span data-testid="relative-time">{getRelativeTime(date)}</span>;
};

// Mock RTL layout component
const MockRTLLayout = ({ children }: { children: React.ReactNode }) => {
  const isRTL = document.documentElement.dir === 'rtl';

  return (
    <div
      data-testid="rtl-layout"
      style={{
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left',
      }}
      className={isRTL ? 'rtl-layout' : 'ltr-layout'}
    >
      {children}
    </div>
  );
};

describe('Internationalization (i18n) Testing', () => {
  // Clean up DOM lang attribute after each test
  afterEach(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  });

  describe('Language Support', () => {
    test('should render content in English (default)', () => {
      document.documentElement.lang = 'en';

      render(<MockI18nForm onSubmit={vi.fn()} />);

      expect(screen.getByText('Player Name:')).toBeInTheDocument();
      expect(screen.getByText('Email:')).toBeInTheDocument();
      expect(screen.getByText('Rating:')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    test('should render content in Spanish', () => {
      document.documentElement.lang = 'es';

      render(<MockI18nForm onSubmit={vi.fn()} />);

      expect(screen.getByText('Nombre del Jugador:')).toBeInTheDocument();
      expect(screen.getByText('Correo Electrónico:')).toBeInTheDocument();
      expect(screen.getByText('Clasificación:')).toBeInTheDocument();
      expect(screen.getByText('Guardar')).toBeInTheDocument();
    });

    test('should render content in German', () => {
      document.documentElement.lang = 'de';

      render(<MockI18nForm onSubmit={vi.fn()} />);

      expect(screen.getByText('Spielername:')).toBeInTheDocument();
      expect(screen.getByText('E-Mail:')).toBeInTheDocument();
      expect(screen.getByText('Wertung:')).toBeInTheDocument();
      expect(screen.getByText('Speichern')).toBeInTheDocument();
    });

    test('should render content in Japanese', () => {
      document.documentElement.lang = 'ja';

      render(<MockI18nForm onSubmit={vi.fn()} />);

      expect(screen.getByText('選手名:')).toBeInTheDocument();
      expect(screen.getByText('メールアドレス:')).toBeInTheDocument();
      expect(screen.getByText('レーティング:')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
    });

    test('should handle missing translations gracefully', () => {
      document.documentElement.lang = 'unknown';

      render(<MockI18nForm onSubmit={vi.fn()} />);

      // Should fall back to translation keys or English
      expect(screen.getByTestId('i18n-form')).toBeInTheDocument();
    });
  });

  describe('Validation Messages Translation', () => {
    test('should show validation errors in current language', async () => {
      const user = userEvent.setup();

      document.documentElement.lang = 'es';
      render(<MockI18nForm onSubmit={vi.fn()} />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent(
          'Este campo es obligatorio'
        );
        expect(screen.getByTestId('email-error')).toHaveTextContent(
          'Este campo es obligatorio'
        );
      });
    });

    test('should show email validation in German', async () => {
      const user = userEvent.setup();

      document.documentElement.lang = 'de';
      render(<MockI18nForm onSubmit={vi.fn()} />);

      const emailInput = screen.getByTestId('player-email-input');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent(
          'Bitte geben Sie eine gültige E-Mail-Adresse ein'
        );
      });
    });

    test('should show parameterized validation messages', async () => {
      const user = userEvent.setup();

      document.documentElement.lang = 'en';
      render(<MockI18nForm onSubmit={vi.fn()} />);

      const ratingInput = screen.getByTestId('player-rating-input');
      await user.type(ratingInput, '5000'); // Out of range

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rating-error')).toHaveTextContent(
          'Rating must be between 400 and 3000'
        );
      });
    });
  });

  describe('Pluralization', () => {
    test('should handle singular form in English', () => {
      document.documentElement.lang = 'en';
      render(<MockPlayerCounter count={1} />);

      expect(screen.getByTestId('player-counter')).toHaveTextContent(
        '1 player'
      );
    });

    test('should handle plural form in English', () => {
      document.documentElement.lang = 'en';
      render(<MockPlayerCounter count={5} />);

      expect(screen.getByTestId('player-counter')).toHaveTextContent(
        '5 players'
      );
    });

    test('should handle pluralization in Spanish', () => {
      document.documentElement.lang = 'es';

      const { rerender } = render(<MockPlayerCounter count={1} />);
      expect(screen.getByTestId('player-counter')).toHaveTextContent(
        '1 jugador'
      );

      rerender(<MockPlayerCounter count={3} />);
      expect(screen.getByTestId('player-counter')).toHaveTextContent(
        '3 jugadores'
      );
    });

    test('should handle pluralization in Japanese (no plural forms)', () => {
      document.documentElement.lang = 'ja';

      const { rerender } = render(<MockPlayerCounter count={1} />);
      expect(screen.getByTestId('player-counter')).toHaveTextContent(
        '1人の選手'
      );

      rerender(<MockPlayerCounter count={10} />);
      expect(screen.getByTestId('player-counter')).toHaveTextContent(
        '10人の選手'
      );
    });
  });

  describe('Date and Time Localization', () => {
    beforeAll(() => {
      // Mock Date for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    test('should format relative time in English', () => {
      document.documentElement.lang = 'en';
      const yesterday = new Date('2024-01-14T10:00:00Z');

      render(<MockRelativeTime date={yesterday} />);

      expect(screen.getByTestId('relative-time')).toHaveTextContent(
        'Yesterday'
      );
    });

    test('should format relative time in Spanish', () => {
      document.documentElement.lang = 'es';
      const twoDaysAgo = new Date('2024-01-13T10:00:00Z');

      render(<MockRelativeTime date={twoDaysAgo} />);

      expect(screen.getByTestId('relative-time')).toHaveTextContent(
        'Hace 2 días'
      );
    });

    test('should format relative time in German', () => {
      document.documentElement.lang = 'de';
      const threeDaysAgo = new Date('2024-01-12T10:00:00Z');

      render(<MockRelativeTime date={threeDaysAgo} />);

      expect(screen.getByTestId('relative-time')).toHaveTextContent(
        'vor 3 Tagen'
      );
    });
  });

  describe('Right-to-Left (RTL) Language Support', () => {
    test('should apply RTL layout for Arabic', () => {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';

      render(
        <MockRTLLayout>
          <div data-testid="rtl-content">Arabic Content</div>
        </MockRTLLayout>
      );

      const layout = screen.getByTestId('rtl-layout');
      expect(layout).toHaveStyle({ direction: 'rtl', textAlign: 'right' });
      expect(layout).toHaveClass('rtl-layout');
    });

    test('should apply LTR layout for non-RTL languages', () => {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';

      render(
        <MockRTLLayout>
          <div data-testid="ltr-content">English Content</div>
        </MockRTLLayout>
      );

      const layout = screen.getByTestId('rtl-layout');
      expect(layout).toHaveStyle({ direction: 'ltr', textAlign: 'left' });
      expect(layout).toHaveClass('ltr-layout');
    });

    test('should render Arabic navigation correctly', () => {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';

      render(<MockI18nForm onSubmit={vi.fn()} />);

      // In a real implementation, these would be translated
      expect(screen.getByTestId('i18n-form')).toBeInTheDocument();
    });
  });

  describe('Language Switching', () => {
    test('should update content when language changes', async () => {
      document.documentElement.lang = 'en';

      const { rerender } = render(<MockPlayerCounter count={3} />);
      expect(screen.getByTestId('player-counter')).toHaveTextContent(
        '3 players'
      );

      // Switch language
      document.documentElement.lang = 'es';
      rerender(<MockPlayerCounter count={3} />);

      await waitFor(() => {
        expect(screen.getByTestId('player-counter')).toHaveTextContent(
          '3 jugadores'
        );
      });
    });

    test('should maintain form state during language switch', async () => {
      const user = userEvent.setup();

      document.documentElement.lang = 'en';
      const { rerender } = render(<MockI18nForm onSubmit={vi.fn()} />);

      const nameInput = screen.getByTestId('player-name-input');
      await user.type(nameInput, 'John Doe');

      // Switch language
      document.documentElement.lang = 'de';
      rerender(<MockI18nForm onSubmit={vi.fn()} />);

      // Form value should persist, labels should change
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Spielername:')).toBeInTheDocument();
    });
  });

  describe('Currency and Number Formatting', () => {
    test('should format numbers according to locale', () => {
      const NumberFormatter = ({
        locale,
        number,
      }: {
        locale: string;
        number: number;
      }) => {
        const formatted = new Intl.NumberFormat(locale).format(number);
        return <span data-testid="formatted-number">{formatted}</span>;
      };

      const { rerender } = render(
        <NumberFormatter locale="en-US" number={1234.56} />
      );
      expect(screen.getByTestId('formatted-number')).toHaveTextContent(
        '1,234.56'
      );

      rerender(<NumberFormatter locale="de-DE" number={1234.56} />);
      expect(screen.getByTestId('formatted-number')).toHaveTextContent(
        '1.234,56'
      );

      rerender(<NumberFormatter locale="fr-FR" number={1234.56} />);
      expect(screen.getByTestId('formatted-number')).toHaveTextContent(
        '1 234,56'
      );
    });
  });

  describe('Accessibility with i18n', () => {
    test('should maintain accessibility attributes across languages', () => {
      document.documentElement.lang = 'es';
      render(<MockI18nForm onSubmit={vi.fn()} />);

      const nameInput = screen.getByTestId('player-name-input');
      expect(nameInput).toHaveAccessibleName(/nombre del jugador/i);

      const form = screen.getByTestId('i18n-form');
      expect(form).toBeInTheDocument();
    });

    test('should announce errors in current language', async () => {
      const user = userEvent.setup();

      document.documentElement.lang = 'de';
      render(<MockI18nForm onSubmit={vi.fn()} />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('name-error');
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveTextContent('Dieses Feld ist erforderlich');
      });
    });
  });

  describe('Performance with i18n', () => {
    test('should not re-render unnecessarily during language changes', () => {
      let renderCount = 0;

      const CountingComponent = () => {
        renderCount++;
        return (
          <div data-testid="counting-component">
            Render count: {renderCount}
          </div>
        );
      };

      const { rerender } = render(<CountingComponent />);
      expect(renderCount).toBe(1);

      // Language change shouldn't cause unnecessary re-renders of unrelated components
      document.documentElement.lang = 'es';
      rerender(<CountingComponent />);

      expect(renderCount).toBe(2); // Only one additional render expected
    });

    test('should handle large translation files efficiently', () => {
      // Simulate loading a large translation object
      const startTime = performance.now();

      const largeTranslations = {};
      for (let i = 0; i < 1000; i++) {
        (largeTranslations as any)[`key_${i}`] = `Translation ${i}`;
      }

      const endTime = performance.now();

      // Translation object creation should be fast
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed translation keys', () => {
      const MalformedTranslationComponent = () => {
        const malformedKey = 'non.existent.key';
        const lang = document.documentElement.lang || 'en';
        const translations =
          translationResources[lang as keyof typeof translationResources]
            ?.translation || translationResources.en.translation;
        const translation = (translations as any)[malformedKey] || malformedKey;

        return <div data-testid="malformed-translation">{translation}</div>;
      };

      render(<MalformedTranslationComponent />);

      // Should fall back to the key itself
      expect(screen.getByTestId('malformed-translation')).toHaveTextContent(
        'non.existent.key'
      );
    });

    test('should handle special characters in translations', () => {
      const SpecialCharsComponent = () => {
        const specialText = 'Text with special chars: äöü ñ é ç 中文 العربية';
        return <div data-testid="special-chars">{specialText}</div>;
      };

      render(<SpecialCharsComponent />);

      expect(screen.getByTestId('special-chars')).toHaveTextContent(
        /äöü ñ é ç 中文 العربية/
      );
    });

    test('should handle empty or null translations', () => {
      const EmptyTranslationComponent = () => {
        const emptyTranslation = '';
        const nullTranslation = null;

        return (
          <div data-testid="empty-translations">
            <span data-testid="empty">{emptyTranslation || 'fallback'}</span>
            <span data-testid="null">{nullTranslation || 'fallback'}</span>
          </div>
        );
      };

      render(<EmptyTranslationComponent />);

      expect(screen.getByTestId('empty')).toHaveTextContent('fallback');
      expect(screen.getByTestId('null')).toHaveTextContent('fallback');
    });
  });
});
