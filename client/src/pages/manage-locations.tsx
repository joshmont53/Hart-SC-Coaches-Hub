import { useState } from 'react';
import type { Location } from '../lib/typeAdapters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, Menu } from 'lucide-react';

interface ManageLocationsProps {
  locations: Location[];
  onBack: () => void;
}

const poolTypes = ['25m', '50m'];

export function ManageLocations({ locations, onBack }: ManageLocationsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    poolType: '25m',
  });

  const handleAdd = () => {
    console.log('Add location:', formData);
    alert('Location added successfully!');
    setIsAddDialogOpen(false);
    setFormData({ name: '', poolType: '25m' });
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      poolType: location.poolType,
    });
  };

  const handleSaveEdit = () => {
    console.log('Update location:', editingLocation?.id, formData);
    alert('Location updated successfully!');
    setEditingLocation(null);
    setFormData({ name: '', poolType: '25m' });
  };

  const handleDelete = (location: Location) => {
    setDeletingLocation(location);
  };

  const confirmDelete = () => {
    console.log('Delete location:', deletingLocation?.id);
    alert('Location deleted successfully!');
    setDeletingLocation(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="view-manage-locations">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">Locations</h1>
                <p className="text-sm text-muted-foreground">Manage pool locations</p>
              </div>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-location">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="space-y-3">
            {locations.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No locations found. Add your first location to get started.</p>
              </Card>
            ) : (
              locations.map((location) => (
                <Card
                  key={location.id}
                  className="p-4"
                  data-testid={`location-card-${location.id}`}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">{location.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {location.poolType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(location)}
                        data-testid={`button-edit-location-${location.id}`}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(location)}
                        data-testid={`button-delete-location-${location.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-location">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>Add a new pool location to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Olympic Pool"
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="poolType">Pool Type *</Label>
              <Select
                value={formData.poolType}
                onValueChange={(value) => setFormData({ ...formData, poolType: value })}
              >
                <SelectTrigger id="poolType" data-testid="select-pool-type">
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} data-testid="button-save-location">
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent data-testid="dialog-edit-location">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update location information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Location Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-poolType">Pool Type *</Label>
              <Select
                value={formData.poolType}
                onValueChange={(value) => setFormData({ ...formData, poolType: value })}
              >
                <SelectTrigger id="edit-poolType" data-testid="select-edit-pool-type">
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
            <Button variant="outline" onClick={() => setEditingLocation(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-update-location">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingLocation} onOpenChange={(open) => !open && setDeletingLocation(null)}>
        <DialogContent data-testid="dialog-delete-location">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingLocation?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLocation(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete-location">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
