import {
  CheckCircle,
  PlayArrow,
  RadioButtonUnchecked,
  Schedule,
} from '@mui/icons-material';
import type { TFunction } from 'i18next';
import type { ReactElement } from 'react';

export function getRoundStatusIcon(status: string): ReactElement {
  switch (status) {
    case 'planned':
    case 'upcoming':
      return <RadioButtonUnchecked color="action" />;
    case 'pairing':
      return <Schedule color="info" />;
    case 'published':
      return <PlayArrow color="primary" />;
    case 'in_progress':
    case 'finishing':
      return <Schedule color="warning" />;
    case 'completed':
    case 'verified':
      return <CheckCircle color="success" />;
    default:
      return <RadioButtonUnchecked />;
  }
}

export function getRoundStatusColor(
  status: string
): 'default' | 'warning' | 'success' | 'info' | 'primary' {
  switch (status) {
    case 'planned':
    case 'upcoming':
      return 'default';
    case 'pairing':
      return 'info';
    case 'published':
      return 'primary';
    case 'in_progress':
    case 'finishing':
      return 'warning';
    case 'completed':
    case 'verified':
      return 'success';
    default:
      return 'default';
  }
}

export function getStatusLabel(status: string, t: TFunction): string {
  switch (status) {
    case 'planned':
    case 'upcoming':
      return t('rounds.status.planned');
    case 'pairing':
      return t('rounds.status.pairing');
    case 'published':
      return t('rounds.status.published');
    case 'in_progress':
      return t('rounds.status.inProgress');
    case 'finishing':
      return t('rounds.status.finishing');
    case 'completed':
      return t('rounds.status.completed');
    case 'verified':
      return t('rounds.status.verified');
    default:
      return t('rounds.status.unknown');
  }
}
