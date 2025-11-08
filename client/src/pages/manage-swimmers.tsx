import { useState } from 'react';
import type { Swimmer, Squad } from '../lib/typeAdapters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    <div className="max-w-7xl mx-auto" data-testid="view-manage-swimmers">
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manage Swimmers</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-swimmer">
              <Plus className="h-4 w-4 mr-2" />
              Add Swimmer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Squad</TableHead>
                <TableHead>ASA Number</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {swimmers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No swimmers found. Add your first swimmer to get started.
                  </TableCell>
                </TableRow>
              ) : (
                swimmers.map((swimmer) => (
                  <TableRow key={swimmer.id} data-testid={`swimmer-row-${swimmer.id}`}>
                    <TableCell>
                      {swimmer.firstName} {swimmer.lastName}
                    </TableCell>
                    <TableCell>{swimmer.dateOfBirth.toLocaleDateString()}</TableCell>

                    <TableCell>
                      {squads.find((s) => s.id === swimmer.squadId)?.name || '-'}
                    </TableCell>
                    <TableCell>{swimmer.asaNumber}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(swimmer)}
                          data-testid={`button-edit-swimmer-${swimmer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(swimmer)}
                          data-testid={`button-delete-swimmer-${swimmer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
