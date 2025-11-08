import { useState } from 'react';
import { Swimmer, Squad } from '../types';
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
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ArrowLeft, Plus, Pencil, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './ui/utils';

interface ManageSwimmersProps {
  swimmers: Swimmer[];
  squads: Squad[];
  onBack: () => void;
}

export function ManageSwimmers({ swimmers, squads, onBack }: ManageSwimmersProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSwimmer, setEditingSwimmer] = useState<Swimmer | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    squadId: '',
    asaNumber: '',
    dateOfBirth: undefined as Date | undefined,
  });

  const handleAddSwimmer = () => {
    setEditingSwimmer(null);
    setFormData({
      firstName: '',
      lastName: '',
      squadId: '',
      asaNumber: '',
      dateOfBirth: undefined,
    });
    setIsDialogOpen(true);
  };

  const handleEditSwimmer = (swimmer: Swimmer) => {
    setEditingSwimmer(swimmer);
    setFormData({
      firstName: swimmer.firstName,
      lastName: swimmer.lastName,
      squadId: swimmer.squadId,
      asaNumber: swimmer.asaNumber.toString(),
      dateOfBirth: swimmer.dateOfBirth,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSwimmer = (swimmer: Swimmer) => {
    if (confirm(`Are you sure you want to delete ${swimmer.firstName} ${swimmer.lastName}?`)) {
      alert('Delete functionality coming soon!');
    }
  };

  const handleSubmit = () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.squadId ||
      !formData.asaNumber ||
      !formData.dateOfBirth
    ) {
      alert('Please fill in all fields');
      return;
    }

    const asaNum = parseInt(formData.asaNumber);
    if (isNaN(asaNum)) {
      alert('ASA Number must be a valid number');
      return;
    }

    if (editingSwimmer) {
      alert(`Update swimmer: ${formData.firstName} ${formData.lastName}`);
    } else {
      alert(`Add new swimmer: ${formData.firstName} ${formData.lastName}`);
    }
    setIsDialogOpen(false);
  };

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad ? squad.name : 'Unknown';
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
              <h1>Swimmers</h1>
              <p className="text-sm text-muted-foreground">Manage swimmers across all squads</p>
            </div>
          </div>
          <Button onClick={handleAddSwimmer}>
            <Plus className="h-4 w-4 mr-2" />
            Add Swimmer
          </Button>
        </div>
      </div>

      {/* Swimmers List */}
      <div className="space-y-4">
        {swimmers.map((swimmer) => (
          <div
            key={swimmer.id}
            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3>
                    {swimmer.firstName} {swimmer.lastName}
                  </h3>
                  <Badge variant="secondary">{getSquadName(swimmer.squadId)}</Badge>
                </div>
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <p>ASA: {swimmer.asaNumber}</p>
                  <p>DOB: {format(swimmer.dateOfBirth, 'yyyy-MM-dd')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSwimmer(swimmer)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSwimmer(swimmer)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Swimmer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSwimmer ? 'Edit Swimmer' : 'Add New Swimmer'}
            </DialogTitle>
            <DialogDescription>
              Enter the swimmer's details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Squad */}
            <div className="space-y-2">
              <Label htmlFor="squad">Squad</Label>
              <Select
                value={formData.squadId}
                onValueChange={(value) => setFormData({ ...formData, squadId: value })}
              >
                <SelectTrigger id="squad">
                  <SelectValue placeholder="Select squad" />
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

            {/* ASA Number */}
            <div className="space-y-2">
              <Label htmlFor="asaNumber">ASA Number</Label>
              <Input
                id="asaNumber"
                type="number"
                value={formData.asaNumber}
                onChange={(e) =>
                  setFormData({ ...formData, asaNumber: e.target.value })
                }
                placeholder="e.g., 123456"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left',
                      !formData.dateOfBirth && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateOfBirth ? (
                      format(formData.dateOfBirth, 'dd/MM/yyyy')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dateOfBirth}
                    onSelect={(date) =>
                      setFormData({ ...formData, dateOfBirth: date })
                    }
                    disabled={(date) =>
                      date > new Date() || date < new Date('1900-01-01')
                    }
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1990}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingSwimmer ? 'Save Changes' : 'Add Swimmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
