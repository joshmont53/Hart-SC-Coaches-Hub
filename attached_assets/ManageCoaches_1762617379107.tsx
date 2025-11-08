import { useState } from 'react';
import { Coach, QualificationLevel } from '../types';
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

const getLevelBadgeVariant = (level: QualificationLevel) => {
  switch (level) {
    case 'Level 3':
      return 'default'; // primary blue
    case 'Level 2':
      return 'secondary';
    case 'Level 1':
      return 'outline';
    case 'No Qualification':
      return 'outline';
    default:
      return 'outline';
  }
};

export function ManageCoaches({ coaches, onBack }: ManageCoachesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    level: 'No Qualification' as QualificationLevel,
    dateOfBirth: undefined as Date | undefined,
  });

  const handleAddCoach = () => {
    setEditingCoach(null);
    setFormData({
      firstName: '',
      lastName: '',
      level: 'No Qualification',
      dateOfBirth: undefined,
    });
    setIsDialogOpen(true);
  };

  const handleEditCoach = (coach: Coach) => {
    setEditingCoach(coach);
    setFormData({
      firstName: coach.firstName,
      lastName: coach.lastName,
      level: coach.level,
      dateOfBirth: coach.dateOfBirth,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCoach = (coach: Coach) => {
    if (confirm(`Are you sure you want to delete ${coach.firstName} ${coach.lastName}?`)) {
      alert('Delete functionality coming soon!');
    }
  };

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      alert('Please fill in all fields');
      return;
    }

    if (editingCoach) {
      alert(`Update coach: ${formData.firstName} ${formData.lastName}`);
    } else {
      alert(`Add new coach: ${formData.firstName} ${formData.lastName}`);
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
              <h1>Coaches</h1>
              <p className="text-sm text-muted-foreground">Manage coaching staff</p>
            </div>
          </div>
          <Button onClick={handleAddCoach}>
            <Plus className="h-4 w-4 mr-2" />
            Add Coach
          </Button>
        </div>
      </div>

      {/* Coaches List */}
      <div className="space-y-4">
        {coaches.map((coach) => (
          <div
            key={coach.id}
            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3>
                    {coach.firstName} {coach.lastName}
                  </h3>
                  <Badge variant={getLevelBadgeVariant(coach.level)}>
                    {coach.level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  DOB: {format(coach.dateOfBirth, 'yyyy-MM-dd')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditCoach(coach)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCoach(coach)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Coach Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCoach ? 'Edit Coach' : 'Add New Coach'}
            </DialogTitle>
            <DialogDescription>
              Enter the coach's details below
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

            {/* Qualification Level */}
            <div className="space-y-2">
              <Label htmlFor="level">Qualification Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) =>
                  setFormData({ ...formData, level: value as QualificationLevel })
                }
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level" />
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
                    fromYear={1950}
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
              {editingCoach ? 'Save Changes' : 'Add Coach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
