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
      {/* Compact Inline Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate">Swimmers</h1>
        </div>
        <Button onClick={handleAddSwimmer} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </div>

      {/* Search and Filters */}
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
  );
}