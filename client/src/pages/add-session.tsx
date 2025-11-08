import type { Squad, Location, Coach } from '../lib/typeAdapters';

interface AddSessionProps {
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  onCancel: () => void;
}

export function AddSession({
  squads,
  locations,
  coaches,
  onCancel,
}: AddSessionProps) {
  return <div data-testid="view-add-session">Add Session - Implementation pending</div>;
}
