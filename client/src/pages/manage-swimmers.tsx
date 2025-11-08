import { useState } from 'react';
import type { Swimmer, Squad } from '../lib/typeAdapters';
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

interface ManageSwimmersProps {
  swimmers: Swimmer[];
  squads: Squad[];
  onBack: () => void;
}

export function ManageSwimmers({ swimmers, squads, onBack }: ManageSwimmersProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSwimmer, setEditingSwimmer] = useState<Swimmer | null>(null);
  const [deletingSwimmer, setDeletingSwimmer] = useState<Swimmer | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    squadId: '',
    asaNumber: 0,
  });

  const handleAdd = () => {
    console.log('Add swimmer:', formData);
    alert('Swimmer added successfully!');
    setIsAddDialogOpen(false);
    setFormData({ firstName: '', lastName: '', dateOfBirth: '', squadId: '', asaNumber: 0 });
  };

  const handleEdit = (swimmer: Swimmer) => {
    setEditingSwimmer(swimmer);
    setFormData({
      firstName: swimmer.firstName,
      lastName: swimmer.lastName,
      dateOfBirth: swimmer.dateOfBirth.toISOString().split('T')[0],
      squadId: swimmer.squadId || '',
      asaNumber: swimmer.asaNumber,
    });
  };

  const handleSaveEdit = () => {
    console.log('Update swimmer:', editingSwimmer?.id, formData);
    alert('Swimmer updated successfully!');
    setEditingSwimmer(null);
    setFormData({ firstName: '', lastName: '', dateOfBirth: '', squadId: '', asaNumber: 0 });
  };

  const handleDelete = (swimmer: Swimmer) => {
    setDeletingSwimmer(swimmer);
  };

  const confirmDelete = () => {
    console.log('Delete swimmer:', deletingSwimmer?.id);
    alert('Swimmer deleted successfully!');
    setDeletingSwimmer(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="view-manage-swimmers">
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
                <h1 className="text-2xl font-semibold">Swimmers</h1>
                <p className="text-sm text-muted-foreground">Manage swimmers across all squads</p>
              </div>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-swimmer">
              <Plus className="h-4 w-4 mr-2" />
              Add Swimmer
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="space-y-3">
            {swimmers.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No swimmers found. Add your first swimmer to get started.</p>
              </Card>
            ) : (
              swimmers.map((swimmer) => (
                <Card
                  key={swimmer.id}
                  className="p-4 flex items-start justify-between gap-4"
                  data-testid={`swimmer-card-${swimmer.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-lg mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{swimmer.name}</h3>
                    <Badge variant="secondary" className="mb-2">
                      {squads.find((s) => s.id === swimmer.squadId)?.name || 'No Squad'}
                    </Badge>
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      ASA: {swimmer.asaNumber}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      DOB: {swimmer.dateOfBirth.toLocaleDateString('en-CA')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(swimmer)}
                      data-testid={`button-edit-swimmer-${swimmer.id}`}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(swimmer)}
                      data-testid={`button-delete-swimmer-${swimmer.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-swimmer">
          <DialogHeader>
            <DialogTitle>Add New Swimmer</DialogTitle>
            <DialogDescription>Add a new swimmer to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                data-testid="input-last-name"
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                data-testid="input-dob"
              />
            </div>
            <div>
              <Label htmlFor="squadId">Squad *</Label>
              <Select
                value={formData.squadId}
                onValueChange={(value) => setFormData({ ...formData, squadId: value })}
              >
                <SelectTrigger id="squadId" data-testid="select-squad">
                  <SelectValue placeholder="Select a squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="asaNumber">ASA Number</Label>
              <Input
                id="asaNumber"
                type="number"
                value={formData.asaNumber}
                onChange={(e) => setFormData({ ...formData, asaNumber: parseInt(e.target.value) || 0 })}
                data-testid="input-asa-number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} data-testid="button-save-swimmer">
              Add Swimmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSwimmer} onOpenChange={(open) => !open && setEditingSwimmer(null)}>
        <DialogContent data-testid="dialog-edit-swimmer">
          <DialogHeader>
            <DialogTitle>Edit Swimmer</DialogTitle>
            <DialogDescription>Update swimmer information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                data-testid="input-edit-first-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                data-testid="input-edit-last-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
              <Input
                id="edit-dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                data-testid="input-edit-dob"
              />
            </div>
            <div>
              <Label htmlFor="edit-squadId">Squad *</Label>
              <Select
                value={formData.squadId}
                onValueChange={(value) => setFormData({ ...formData, squadId: value })}
              >
                <SelectTrigger id="edit-squadId" data-testid="select-edit-squad">
                  <SelectValue placeholder="Select a squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-asaNumber">ASA Number</Label>
              <Input
                id="edit-asaNumber"
                type="number"
                value={formData.asaNumber}
                onChange={(e) => setFormData({ ...formData, asaNumber: parseInt(e.target.value) || 0 })}
                data-testid="input-edit-asa-number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSwimmer(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-update-swimmer">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSwimmer} onOpenChange={(open) => !open && setDeletingSwimmer(null)}>
        <DialogContent data-testid="dialog-delete-swimmer">
          <DialogHeader>
            <DialogTitle>Delete Swimmer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingSwimmer?.firstName} {deletingSwimmer?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSwimmer(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete-swimmer">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
