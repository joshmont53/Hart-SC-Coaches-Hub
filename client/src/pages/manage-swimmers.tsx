import type { Swimmer, Squad } from '../lib/typeAdapters';

interface ManageSwimmersProps {
  swimmers: Swimmer[];
  squads: Squad[];
  onBack: () => void;
}

export function ManageSwimmers({ swimmers, squads, onBack }: ManageSwimmersProps) {
  return <div data-testid="view-manage-swimmers">Manage Swimmers - Implementation pending</div>;
}
