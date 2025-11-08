import { useState } from 'react';
import type { Coach, QualificationLevel } from '../lib/typeAdapters';
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

interface ManageCoachesProps {
  coaches: Coach[];
  onBack: () => void;
}

const qualificationLevels: QualificationLevel[] = [
  'No Qualification',
  'Level 1',
  'Level 2',
  'Level 3',
];

export function ManageCoaches({ coaches, onBack }: ManageCoachesProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [deletingCoach, setDeletingCoach] = useState<Coach | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    level: 'Level 1' as QualificationLevel,
    dateOfBirth: '',
  });

  const handleAdd = () => {
    console.log('Add coach:', formData);
    alert('Coach added successfully!');
    setIsAddDialogOpen(false);
    setFormData({ firstName: '', lastName: '', level: 'Level 1' as QualificationLevel, dateOfBirth: '' });
  };

  const handleEdit = (coach: Coach) => {
    setEditingCoach(coach);
    setFormData({
      firstName: coach.firstName,
      lastName: coach.lastName,
      level: coach.level,
      dateOfBirth: coach.dateOfBirth.toISOString().split('T')[0],
    });
  };

  const handleSaveEdit = () => {
    console.log('Update coach:', editingCoach?.id, formData);
    alert('Coach updated successfully!');
    setEditingCoach(null);
    setFormData({ firstName: '', lastName: '', level: 'Level 1' as QualificationLevel, dateOfBirth: '' });
  };

  const handleDelete = (coach: Coach) => {
    setDeletingCoach(coach);
  };

  const confirmDelete = () => {
    console.log('Delete coach:', deletingCoach?.id);
    alert('Coach deleted successfully!');
    setDeletingCoach(null);
  };

  return (
    <div className="max-w-7xl mx-auto" data-testid="view-manage-coaches">
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manage Coaches</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-coach">
              <Plus className="h-4 w-4 mr-2" />
              Add Coach
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Qualification Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No coaches found. Add your first coach to get started.
                  </TableCell>
                </TableRow>
              ) : (
                coaches.map((coach) => (
                  <TableRow key={coach.id} data-testid={`coach-row-${coach.id}`}>
                    <TableCell>{coach.name}</TableCell>
                    <TableCell>{coach.dateOfBirth.toLocaleDateString()}</TableCell>
                    <TableCell>{coach.level}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(coach)}
                          data-testid={`button-edit-coach-${coach.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(coach)}
                          data-testid={`button-delete-coach-${coach.id}`}
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
        <DialogContent data-testid="dialog-add-coach">
          <DialogHeader>
            <DialogTitle>Add New Coach</DialogTitle>
            <DialogDescription>Add a new coach to the system</DialogDescription>
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
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                data-testid="input-date-of-birth"
              />
            </div>
            <div>
              <Label htmlFor="level">Qualification Level *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value as QualificationLevel })}
              >
                <SelectTrigger id="level" data-testid="select-level">
                  <SelectValue placeholder="Select qualification level" />
                </SelectTrigger>
                <SelectContent>
                  {qualificationLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
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
            <Button onClick={handleAdd} data-testid="button-save-coach">
              Add Coach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCoach} onOpenChange={(open) => !open && setEditingCoach(null)}>
        <DialogContent data-testid="dialog-edit-coach">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update coach information</DialogDescription>
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
              <Label htmlFor="edit-dateOfBirth">Date of Birth *</Label>
              <Input
                id="edit-dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                data-testid="input-edit-date-of-birth"
              />
            </div>
            <div>
              <Label htmlFor="edit-level">Qualification Level *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value as QualificationLevel })}
              >
                <SelectTrigger id="edit-level" data-testid="select-edit-level">
                  <SelectValue placeholder="Select qualification level" />
                </SelectTrigger>
                <SelectContent>
                  {qualificationLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCoach(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-update-coach">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCoach} onOpenChange={(open) => !open && setDeletingCoach(null)}>
        <DialogContent data-testid="dialog-delete-coach">
          <DialogHeader>
            <DialogTitle>Delete Coach</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingCoach?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCoach(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete-coach">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
