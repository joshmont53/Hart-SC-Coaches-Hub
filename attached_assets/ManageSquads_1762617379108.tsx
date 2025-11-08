import { useState } from 'react';
import { Squad, Coach } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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

interface ManageSquadsProps {
  squads: Squad[];
  coaches: Coach[];
  onBack: () => void;
}

export function ManageSquads({ squads, coaches, onBack }: ManageSquadsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    primaryCoachId: '',
  });

  const handleAddSquad = () => {
    setEditingSquad(null);
    setFormData({
      name: '',
      primaryCoachId: '',
    });
    setIsDialogOpen(true);
  };

  const handleEditSquad = (squad: Squad) => {
    setEditingSquad(squad);
    setFormData({
      name: squad.name,
      primaryCoachId: squad.primaryCoachId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSquad = (squad: Squad) => {
    if (confirm(`Are you sure you want to delete ${squad.name}?`)) {
      alert('Delete functionality coming soon!');
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.primaryCoachId) {
      alert('Please fill in all fields');
      return;
    }

    if (editingSquad) {
      alert(`Update squad: ${formData.name}`);
    } else {
      alert(`Add new squad: ${formData.name}`);
    }
    setIsDialogOpen(false);
  };

  const getCoachName = (coachId?: string) => {
    if (!coachId) return 'None';
    const coach = coaches.find((c) => c.id === coachId);
    return coach ? coach.name : 'Unknown';
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
              <h1>Squads</h1>
              <p className="text-sm text-muted-foreground">Manage training squads</p>
            </div>
          </div>
          <Button onClick={handleAddSquad}>
            <Plus className="h-4 w-4 mr-2" />
            Add Squad
          </Button>
        </div>
      </div>

      {/* Squads List */}
      <div className="space-y-4">
        {squads.map((squad) => (
          <div
            key={squad.id}
            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="mb-1">{squad.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Primary Coach: {getCoachName(squad.primaryCoachId)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSquad(squad)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSquad(squad)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Squad Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSquad ? 'Edit Squad' : 'Create New Squad'}
            </DialogTitle>
            <DialogDescription>
              Enter the squad details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Squad Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Squad Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Senior Elite"
              />
            </div>

            {/* Primary Coach */}
            <div className="space-y-2">
              <Label htmlFor="primaryCoach">Primary Coach</Label>
              <Select
                value={formData.primaryCoachId}
                onValueChange={(value) =>
                  setFormData({ ...formData, primaryCoachId: value })
                }
              >
                <SelectTrigger id="primaryCoach">
                  <SelectValue placeholder="Select primary coach" />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingSquad ? 'Save Changes' : 'Create Squad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
