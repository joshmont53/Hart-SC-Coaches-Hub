import { useState } from 'react';
import type { Squad, Coach } from '../lib/typeAdapters';
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

interface ManageSquadsProps {
  squads: Squad[];
  coaches: Coach[];
  onBack: () => void;
}

export function ManageSquads({ squads, coaches, onBack }: ManageSquadsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [deletingSquad, setDeletingSquad] = useState<Squad | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    primaryCoachId: '',
    color: '#3B82F6',
  });

  const handleAdd = () => {
    console.log('Add squad:', formData);
    alert('Squad added successfully!');
    setIsAddDialogOpen(false);
    setFormData({ name: '', primaryCoachId: '', color: '#3B82F6' });
  };

  const handleEdit = (squad: Squad) => {
    setEditingSquad(squad);
    setFormData({
      name: squad.name,
      primaryCoachId: squad.primaryCoachId || '',
      color: squad.color,
    });
  };

  const handleSaveEdit = () => {
    console.log('Update squad:', editingSquad?.id, formData);
    alert('Squad updated successfully!');
    setEditingSquad(null);
    setFormData({ name: '', primaryCoachId: '', color: '#3B82F6' });
  };

  const handleDelete = (squad: Squad) => {
    setDeletingSquad(squad);
  };

  const confirmDelete = () => {
    console.log('Delete squad:', deletingSquad?.id);
    alert('Squad deleted successfully!');
    setDeletingSquad(null);
  };

  return (
    <div className="max-w-7xl mx-auto" data-testid="view-manage-squads">
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manage Squads</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-squad">
              <Plus className="h-4 w-4 mr-2" />
              Add Squad
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Primary Coach</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {squads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No squads found. Add your first squad to get started.
                  </TableCell>
                </TableRow>
              ) : (
                squads.map((squad) => (
                  <TableRow key={squad.id} data-testid={`squad-row-${squad.id}`}>
                    <TableCell>
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: squad.color }}
                        title={squad.color}
                      />
                    </TableCell>
                    <TableCell>{squad.name}</TableCell>
                    <TableCell>
                      {coaches.find((c) => c.id === squad.primaryCoachId)?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(squad)}
                          data-testid={`button-edit-squad-${squad.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(squad)}
                          data-testid={`button-delete-squad-${squad.id}`}
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
        <DialogContent data-testid="dialog-add-squad">
          <DialogHeader>
            <DialogTitle>Add New Squad</DialogTitle>
            <DialogDescription>Add a new training squad to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Squad Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="primaryCoachId">Primary Coach *</Label>
              <Select
                value={formData.primaryCoachId}
                onValueChange={(value) => setFormData({ ...formData, primaryCoachId: value })}
              >
                <SelectTrigger id="primaryCoachId" data-testid="select-coach">
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">Squad Color *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                  data-testid="input-color"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} data-testid="button-save-squad">
              Add Squad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSquad} onOpenChange={(open) => !open && setEditingSquad(null)}>
        <DialogContent data-testid="dialog-edit-squad">
          <DialogHeader>
            <DialogTitle>Edit Squad</DialogTitle>
            <DialogDescription>Update squad information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Squad Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-primaryCoachId">Primary Coach *</Label>
              <Select
                value={formData.primaryCoachId}
                onValueChange={(value) => setFormData({ ...formData, primaryCoachId: value })}
              >
                <SelectTrigger id="edit-primaryCoachId" data-testid="select-edit-coach">
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-color">Squad Color *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                  data-testid="input-edit-color"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSquad(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-update-squad">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSquad} onOpenChange={(open) => !open && setDeletingSquad(null)}>
        <DialogContent data-testid="dialog-delete-squad">
          <DialogHeader>
            <DialogTitle>Delete Squad</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingSquad?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSquad(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete-squad">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
