'use client';

import { TeethSelector } from './TeethSelector';
import type { ToothSelection } from './TeethSelector';

interface Props {
  teeth: Array<{
    toothNumber: string;
    workType: string;
    shade?: string | null;
    notes?: string | null;
    implant?: boolean;
  }>;
}

export function TeethReadOnlyView({ teeth }: Props) {
  const selections: ToothSelection[] = teeth.map((t) => ({
    toothNumber: t.toothNumber,
    workType: t.workType.toLowerCase() as any,
    shade: t.shade || undefined,
    notes: t.notes || undefined,
    implant: t.implant || false,
  }));

  return (
    <TeethSelector
      selectedTeeth={selections}
      onTeethChange={() => {}}
      readOnly={true}
    />
  );
}
