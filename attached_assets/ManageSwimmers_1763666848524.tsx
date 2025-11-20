import { ArrowLeft, Plus, Pencil, Trash2, CalendarIcon, Users, Search, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Swimmer, Squad } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
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
  const [selectedSwimmers, setSelectedSwimmers] = useState<Set<string>>(new Set());
  const [isBulkSquadDialogOpen, setIsBulkSquadDialogOpen] = useState(false);
  const [bulkSquadId, setBulkSquadId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSquadId, setFilterSquadId] = useState<string>('all');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    squadId: '',
    asaNumber: '',
  });

  const handleAddSwimmer = () => {
    setEditingSwimmer(null);
    setFormData({
      firstName: '',
      lastName: '',
      squadId: '',
      asaNumber: '',
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
      !formData.asaNumber
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

  const handleBulkSquadChange = (swimmerId: string) => {
    const newSelectedSwimmers = new Set(selectedSwimmers);
    if (newSelectedSwimmers.has(swimmerId)) {
      newSelectedSwimmers.delete(swimmerId);
    } else {
      newSelectedSwimmers.add(swimmerId);
    }
    setSelectedSwimmers(newSelectedSwimmers);
  };

  const handleSelectAll = () => {
    if (selectedSwimmers.size === filteredSwimmers.length && filteredSwimmers.length > 0) {
      setSelectedSwimmers(new Set());
    } else {
      setSelectedSwimmers(new Set(filteredSwimmers.map(s => s.id)));
    }
  };

  const handleBulkSquadSubmit = () => {
    if (!bulkSquadId) {
      alert('Please select a squad');
      return;
    }

    const selectedSwimmersArray = Array.from(selectedSwimmers);
    if (selectedSwimmersArray.length === 0) {
      alert('Please select at least one swimmer');
      return;
    }

    const squadName = getSquadName(bulkSquadId);
    const swimmerNames = selectedSwimmersArray
      .map(id => {
        const swimmer = swimmers.find(s => s.id === id);
        return swimmer ? `${swimmer.firstName} ${swimmer.lastName}` : '';
      })
      .filter(name => name !== '');

    // In real implementation, this would update the database
    alert(
      `Successfully moved ${selectedSwimmersArray.length} swimmer${selectedSwimmersArray.length > 1 ? 's' : ''} to ${squadName}:\n\n${swimmerNames.join('\n')}`
    );
    
    setIsBulkSquadDialogOpen(false);
    setSelectedSwimmers(new Set());
    setBulkSquadId('');
  };

  // Filter swimmers based on search query and squad filter
  const filteredSwimmers = useMemo(() => {
    return swimmers.filter(swimmer => {
      // Search by name or ASA number
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
                           swimmer.firstName.toLowerCase().includes(searchLower) ||
                           swimmer.lastName.toLowerCase().includes(searchLower) ||
                           swimmer.asaNumber.toString().includes(searchQuery);
      
      // Filter by squad
      const matchesSquad = filterSquadId === 'all' || swimmer.squadId === filterSquadId;
      
      return matchesSearch && matchesSquad;
    });
  }, [swimmers, searchQuery, filterSquadId]);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1>Swimmers</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedSwimmers.size === filteredSwimmers.length && filteredSwimmers.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
            <Button onClick={handleAddSwimmer}>
              <Plus className="h-4 w-4 mr-2" />
              Add Swimmer
            </Button>
          </div>
          <Button onClick={handleAddSwimmer} className="sm:hidden">
            <Plus className="h-4 w-4 mr-2" />
            Add Swimmer
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ASA number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterSquadId}
            onValueChange={setFilterSquadId}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by squad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Squads</SelectItem>
              {squads.map((squad) => (
                <SelectItem key={squad.id} value={squad.id}>
                  {squad.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Select All Button */}
        <div className="sm:hidden mt-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSelectAll}
            className="w-full"
          >
            {selectedSwimmers.size === filteredSwimmers.length && filteredSwimmers.length > 0 ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      </div>

      {/* Swimmers List */}
      <div className="space-y-4">
        {filteredSwimmers.map((swimmer) => {
          const isSelected = selectedSwimmers.has(swimmer.id);
          return (
          <div
            key={swimmer.id}
            className={cn(
              "border rounded-lg p-4 transition-all",
              isSelected 
                ? "bg-[#4B9A4A]/10 border-[#4B9A4A] shadow-sm" 
                : "bg-card hover:bg-accent/50"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Checkbox
                  id={`swimmer-${swimmer.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleBulkSquadChange(swimmer.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="mb-2">
                    {swimmer.firstName} {swimmer.lastName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getSquadName(swimmer.squadId)}</Badge>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">ASA: {swimmer.asaNumber}</span>
                  </div>
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
        );
        })}
      </div>

      {/* Bulk Action Toolbar - Fixed at bottom */}
      {selectedSwimmers.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-2xl">
          <div className="bg-[#4B9A4A] text-white rounded-full shadow-lg px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 justify-center">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm sm:text-base">{selectedSwimmers.size} selected</span>
            </div>
            <div className="h-4 w-px bg-white/30" />
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 hover:text-white text-sm"
              onClick={() => {
                setBulkSquadId('');
                setIsBulkSquadDialogOpen(true);
              }}
            >
              Change Squad
            </Button>
          </div>
        </div>
      )}

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

      {/* Bulk Squad Dialog */}
      <Dialog open={isBulkSquadDialogOpen} onOpenChange={setIsBulkSquadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Move {selectedSwimmers.size} Swimmer{selectedSwimmers.size > 1 ? 's' : ''} to Squad
            </DialogTitle>
            <DialogDescription>
              Select a squad to move the selected swimmers to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selected Swimmers Summary */}
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm mb-2">Moving swimmers:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(selectedSwimmers).map(id => {
                  const swimmer = swimmers.find(s => s.id === id);
                  return swimmer ? (
                    <div key={id} className="text-sm flex items-center justify-between">
                      <span>{swimmer.firstName} {swimmer.lastName}</span>
                      <Badge variant="outline" className="text-xs">
                        {getSquadName(swimmer.squadId)}
                      </Badge>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Squad */}
            <div className="space-y-2">
              <Label htmlFor="bulkSquad">New Squad</Label>
              <Select
                value={bulkSquadId}
                onValueChange={(value) => setBulkSquadId(value)}
              >
                <SelectTrigger id="bulkSquad">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkSquadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkSquadSubmit}
              className="bg-[#4B9A4A] hover:bg-[#3d7f3d]"
            >
              Move Swimmers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}