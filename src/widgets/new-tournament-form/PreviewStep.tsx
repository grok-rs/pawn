import type { TimeControlTemplate } from '@dto/bindings';
import { commands } from '@dto/bindings';
import TournamentPreview from '@widgets/tournament-list/TournamentPreview';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { TournamentFormValues } from './types';

function PreviewStep() {
  const { getValues } = useFormContext<TournamentFormValues>();
  const [timeControlTemplates, setTimeControlTemplates] = useState<
    TimeControlTemplate[]
  >([]);

  const formData = getValues();

  useEffect(() => {
    const loadTimeControlTemplates = async () => {
      try {
        const templates = await commands.getTimeControlTemplates();
        setTimeControlTemplates(templates);
      } catch (_error) {}
    };

    loadTimeControlTemplates();
  }, []);

  return (
    <TournamentPreview
      formData={formData}
      timeControlTemplates={timeControlTemplates}
    />
  );
}

export default PreviewStep;
