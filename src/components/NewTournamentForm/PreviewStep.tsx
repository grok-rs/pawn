import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { commands } from '../../dto/bindings';
import type { TournamentFormValues } from './types';
import type { TimeControlTemplate } from '../../dto/bindings';
import TournamentPreview from '../TournamentPreview';

const PreviewStep: React.FC = () => {
  const { getValues } = useFormContext<TournamentFormValues>();
  const [timeControlTemplates, setTimeControlTemplates] = useState<TimeControlTemplate[]>([]);
  
  const formData = getValues();

  useEffect(() => {
    const loadTimeControlTemplates = async () => {
      try {
        const templates = await commands.getTimeControlTemplates();
        setTimeControlTemplates(templates);
      } catch (error) {
        console.error('Failed to load time control templates:', error);
      }
    };

    loadTimeControlTemplates();
  }, []);

  return (
    <TournamentPreview 
      formData={formData} 
      timeControlTemplates={timeControlTemplates}
    />
  );
};

export default PreviewStep;