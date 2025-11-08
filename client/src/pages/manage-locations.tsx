import type { Location } from '../lib/typeAdapters';

interface ManageLocationsProps {
  locations: Location[];
  onBack: () => void;
}

export function ManageLocations({ locations, onBack }: ManageLocationsProps) {
  return <div data-testid="view-manage-locations">Manage Locations - Implementation pending</div>;
}
