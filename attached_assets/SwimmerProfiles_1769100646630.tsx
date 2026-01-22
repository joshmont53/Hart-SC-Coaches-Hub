import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, User, ArrowLeft } from 'lucide-react';
import { Swimmer, Session, Squad, Coach } from '../types';
import { isPast } from 'date-fns';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface SwimmerProfilesProps {
  swimmers: Swimmer[];
  sessions: Session[];
  squads: Squad[];
  coach: Coach;
  onSelectSwimmer: (swimmer: Swimmer) => void;
  onBack: () => void;
}

export function SwimmerProfiles({ 
  swimmers, 
  sessions, 
  squads, 
  coach,
  onSelectSwimmer,
  onBack
}: SwimmerProfilesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSquad, setSelectedSquad] = useState<string>('all');

  // Find squads where coach is involved
  const coachSquads = useMemo(() => {
    const coachSessions = sessions.filter(session => 
      session.leadCoachId === coach.id || 
      session.secondCoachId === coach.id || 
      session.helperId === coach.id
    );
    const squadIds = [...new Set(coachSessions.map(s => s.squadId))];
    return squads.filter(s => squadIds.includes(s.id));
  }, [sessions, squads, coach.id]);

  // Filter swimmers by squad and search term
  const filteredSwimmers = useMemo(() => {
    let filtered = swimmers;

    // Filter by squad
    if (selectedSquad !== 'all') {
      filtered = filtered.filter(s => s.squadId === selectedSquad);
    } else {
      // Only show swimmers from coach's squads
      const squadIds = coachSquads.map(s => s.id);
      filtered = filtered.filter(s => squadIds.includes(s.squadId));
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(swimmer =>
        swimmer.firstName.toLowerCase().includes(term) ||
        swimmer.lastName.toLowerCase().includes(term) ||
        `${swimmer.firstName} ${swimmer.lastName}`.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [swimmers, coachSquads, selectedSquad, searchTerm]);

  // Calculate attendance for each swimmer
  const swimmersWithStats = useMemo(() => {
    return filteredSwimmers.map(swimmer => {
      const squadSessions = sessions.filter(s => 
        s.squadId === swimmer.squadId && 
        isPast(new Date(s.date))
      );
      
      // Mock attendance calculation
      const attended = Math.floor(squadSessions.length * (0.65 + Math.random() * 0.35));
      const percentage = squadSessions.length > 0 ? Math.round((attended / squadSessions.length) * 100) : 0;
      
      return {
        swimmer,
        percentage,
        attended,
        total: squadSessions.length
      };
    });
  }, [filteredSwimmers, sessions]);

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      {/* Compact Inline Header - Sticky */}
      <div className="flex items-center gap-3 pb-3 border-b shrink-0 sticky top-0 bg-background z-10 pt-4 lg:pt-0 lg:mb-6 lg:static">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate">Swimmer Profiles</h1>
        </div>
      </div>

      {/* Search and Filter Bar - Sticky */}
      <div className="flex flex-col sm:flex-row gap-3 pb-4 sticky top-[57px] lg:top-0 bg-background z-10 lg:static lg:mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search swimmers by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSquad} onValueChange={setSelectedSquad}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by squad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Squads</SelectItem>
            {coachSquads.map(squad => (
              <SelectItem key={squad.id} value={squad.id}>
                {squad.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count - Sticky */}
      <div className="text-sm text-muted-foreground pb-4 sticky top-[121px] lg:top-0 bg-background z-10 lg:static lg:mb-4">
        {swimmersWithStats.length} swimmer{swimmersWithStats.length !== 1 ? 's' : ''} found
      </div>

      {/* Swimmers Grid - Scrollable */}
      <div className="flex-1 overflow-auto">
        {swimmersWithStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
            {swimmersWithStats.map(({ swimmer, percentage, attended, total }) => {
              const squad = squads.find(s => s.id === swimmer.squadId);
              const initials = `${swimmer.firstName[0]}${swimmer.lastName[0]}`.toUpperCase();
              
              return (
                <Card
                  key={swimmer.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onSelectSwimmer(swimmer)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                        style={{ backgroundColor: '#4B9A4A' }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {swimmer.firstName} {swimmer.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {squad?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline"
                            style={
                              percentage >= 90 ? {
                                backgroundColor: '#4B9A4A15',
                                color: '#4B9A4A',
                                borderColor: '#4B9A4A40'
                              } : percentage >= 75 ? {
                                backgroundColor: '#fbbf2415',
                                color: '#f59e0b',
                                borderColor: '#f59e0b40'
                              } : {
                                backgroundColor: '#ef444415',
                                color: '#ef4444',
                                borderColor: '#ef444440'
                              }
                            }
                            className="text-xs"
                          >
                            {percentage}% attendance
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {attended}/{total} sessions attended
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No swimmers found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No swimmers available in your squads'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}