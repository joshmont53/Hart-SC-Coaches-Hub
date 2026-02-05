import { useState, useMemo } from 'react';
import type { Session, Squad, Location, Coach } from '../lib/typeAdapters';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface SessionSearchProps {
  sessions: Session[];
  squads: Squad[];
  coaches: Coach[];
  locations: Location[];
  onSessionClick: (session: Session) => void;
  showResultsOnly?: boolean;
}

export function SessionSearch({
  sessions,
  squads,
  coaches,
  locations,
  onSessionClick,
  showResultsOnly = false,
}: SessionSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getSquadName = (squadId: string) => {
    return squads.find(s => s.id === squadId)?.name || 'Unknown Squad';
  };

  const getCoachName = (coachId?: string | null) => {
    if (!coachId) return null;
    const coach = coaches.find(c => c.id === coachId);
    return coach ? coach.name : null;
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || 'Unknown';
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getContentExcerpt = (content: string, searchTerm: string): string | null => {
    if (!content || !searchTerm) return null;
    
    const plainText = stripHtml(content);
    const lowerContent = plainText.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerSearch);
    
    if (matchIndex === -1) return null;
    
    const start = Math.max(0, matchIndex - 50);
    const end = Math.min(plainText.length, matchIndex + searchTerm.length + 50);
    
    let excerpt = plainText.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < plainText.length) excerpt = excerpt + '...';
    
    return excerpt;
  };

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedSearchTerm})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    const query = searchQuery.toLowerCase();
    
    return sessions
      .filter(session => {
        if (getSquadName(session.squadId).toLowerCase().includes(query)) return true;
        
        const leadCoach = getCoachName(session.leadCoachId);
        if (leadCoach?.toLowerCase().includes(query)) return true;
        
        const secondCoach = getCoachName(session.secondCoachId);
        if (secondCoach?.toLowerCase().includes(query)) return true;
        
        const helper = getCoachName(session.helperId);
        if (helper?.toLowerCase().includes(query)) return true;
        
        const setWriter = getCoachName(session.setWriterId);
        if (setWriter?.toLowerCase().includes(query)) return true;
        
        if (getLocationName(session.locationId).toLowerCase().includes(query)) return true;
        
        if (session.focus.toLowerCase().includes(query)) return true;
        
        if (session.content) {
          const plainContent = stripHtml(session.content);
          if (plainContent.toLowerCase().includes(query)) return true;
        }
        
        if (session.contentHtml) {
          const plainContent = stripHtml(session.contentHtml);
          if (plainContent.toLowerCase().includes(query)) return true;
        }
        
        return false;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sessions, searchQuery, squads, coaches, locations]);

  if (showResultsOnly && !searchQuery.trim()) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sessions by squad, coach, content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
          data-testid="input-session-search"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions by squad, coach, content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            autoFocus
            data-testid="input-session-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-sm text-muted-foreground" data-testid="text-results-count">
        {searchQuery ? (
          <span>Found {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}</span>
        ) : (
          <span>Showing all {filteredSessions.length} sessions</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-no-results">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No sessions found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const squadName = getSquadName(session.squadId);
            const leadCoach = getCoachName(session.leadCoachId);
            const contentExcerpt = searchQuery 
              ? getContentExcerpt(session.contentHtml || session.content || '', searchQuery)
              : null;
            const plainContent = session.contentHtml 
              ? stripHtml(session.contentHtml) 
              : session.content 
                ? stripHtml(session.content) 
                : '';
            const displayContent = contentExcerpt || plainContent.substring(0, 100);

            const showCoach = searchQuery && leadCoach?.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <div
                key={session.id}
                onClick={() => onSessionClick(session)}
                className="border rounded-lg p-4 hover-elevate cursor-pointer transition-colors"
                data-testid={`card-session-${session.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" data-testid={`text-squad-name-${session.id}`}>
                      {highlightText(squadName, searchQuery)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span data-testid={`text-date-${session.id}`}>{format(session.date, 'MMM dd, yyyy')}</span>
                      <span>•</span>
                      <span data-testid={`text-time-${session.id}`}>{session.startTime}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0" data-testid={`badge-focus-${session.id}`}>
                    {highlightText(session.focus, searchQuery)}
                  </Badge>
                </div>

                {showCoach && leadCoach && (
                  <div className="text-sm mb-2" data-testid={`text-coach-${session.id}`}>
                    <span className="text-muted-foreground">Coach: </span>
                    {highlightText(leadCoach, searchQuery)}
                  </div>
                )}

                {displayContent && (
                  <div className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-content-${session.id}`}>
                    {highlightText(displayContent, searchQuery)}
                    {!contentExcerpt && plainContent.length > 100 && '...'}
                  </div>
                )}

                {!session.content && !session.contentHtml && (
                  <div className="text-sm text-muted-foreground italic" data-testid={`text-no-content-${session.id}`}>
                    No content yet
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
