import type { Coach } from '../lib/typeAdapters';

interface ManageCoachesProps {
  coaches: Coach[];
  onBack: () => void;
}

export function ManageCoaches({ coaches, onBack }: ManageCoachesProps) {
  return <div data-testid="view-manage-coaches">Manage Coaches - Implementation pending</div>;
}
