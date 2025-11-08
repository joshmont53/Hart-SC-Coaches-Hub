import type { Squad, Coach } from '../lib/typeAdapters';

interface ManageSquadsProps {
  squads: Squad[];
  coaches: Coach[];
  onBack: () => void;
}

export function ManageSquads({ squads, coaches, onBack }: ManageSquadsProps) {
  return <div data-testid="view-manage-squads">Manage Squads - Implementation pending</div>;
}
