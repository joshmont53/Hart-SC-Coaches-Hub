import { useState } from 'react';
import { Location, PoolType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

interface ManageLocationsProps {
  locations: Location[];
  onBack: () => void;
}

const poolTypes: PoolType[] = ['25m', '50m'];

export function ManageLocations({ locations, onBack }: ManageLocationsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    poolType: '25m' as PoolType,
  });

  const handleAddLocation = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      poolType: '25m',
    });
    setIsDialogOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      poolType: location.poolType,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteLocation = (location: Location) => {
    if (confirm(`Are you sure you want to delete ${location.name}?`)) {
      alert('Delete functionality coming soon!');
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.poolType) {
      alert('Please fill in all fields');
      return;
    }

    if (editingLocation) {
      alert(`Update location: ${formData.name}`);
    } else {
      alert(`Add new location: ${formData.name}`);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1>Locations</h1>
              <p className="text-sm text-muted-foreground">Manage pool locations</p>
            </div>
          </div>
          <Button onClick={handleAddLocation}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Locations List */}
      <div className="space-y-4">
        {locations.map((location) => (
          <div
            key={location.id}
            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3>{location.name}</h3>
                  <Badge variant="outline">{location.poolType}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditLocation(location)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLocation(location)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Location Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </DialogTitle>
            <DialogDescription>
              Enter the location details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pool Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Pool Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Hart Leisure Centre"
              />
            </div>

            {/* Pool Type */}
            <div className="space-y-2">
              <Label htmlFor="poolType">Pool Type</Label>
              <Select
                value={formData.poolType}
                onValueChange={(value) =>
                  setFormData({ ...formData, poolType: value as PoolType })
                }
              >
                <SelectTrigger id="poolType">
                  <SelectValue placeholder="Select pool type" />
                </SelectTrigger>
                <SelectContent>
                  {poolTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingLocation ? 'Save Changes' : 'Add Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
