import { useState, useMemo } from 'react';
import { Session, Squad, Coach, Location } from '../types';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './ui/utils';

interface SessionSearchProps {
  sessions: Session[];
  squads: Squad[];
  coaches: Coach[];
  locations: Location[];
  onSessionClick: (session: Session) => void;
  showResultsOnly?: boolean; // For desktop - only show results when searching
}

interface SearchResult {
  session: Session;
  matchedContent?: string;
  highlightPositions: { start: number; end: number; field: string }[];
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

  // Get squad, coach, and location names
  const getSquadName = (squadId: string) => {
    return squads.find(s => s.id === squadId)?.name || 'Unknown Squad';
  };

  const getCoachName = (coachId?: string) => {
    if (!coachId) return null;
    return coaches.find(c => c.id === coachId)?.name || 'Unknown';
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || 'Unknown';
  };

  // Extract text content from HTML
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Get content excerpt with match highlighted
  const getContentExcerpt = (content: string, searchTerm: string): string | null => {
    if (!content || !searchTerm) return null;
    
    const plainText = stripHtml(content);
    const lowerContent = plainText.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerSearch);
    
    if (matchIndex === -1) return null;
    
    // Get context around the match (50 chars before and after)
    const start = Math.max(0, matchIndex - 50);
    const end = Math.min(plainText.length, matchIndex + searchTerm.length + 50);
    
    let excerpt = plainText.substring(start, end);
    
    // Add ellipsis if needed
    if (start > 0) excerpt = '...' + excerpt;
    if (end < plainText.length) excerpt = excerpt + '...';
    
    return excerpt;
  };

  // Highlight search term in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      // Return all sessions sorted by date (newest first)
      return [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    const query = searchQuery.toLowerCase();
    
    return sessions
      .filter(session => {
        // Search in squad name
        if (getSquadName(session.squadId).toLowerCase().includes(query)) return true;
        
        // Search in coach names
        const leadCoach = getCoachName(session.leadCoachId);
        if (leadCoach?.toLowerCase().includes(query)) return true;
        
        const secondCoach = getCoachName(session.secondCoachId);
        if (secondCoach?.toLowerCase().includes(query)) return true;
        
        const helper = getCoachName(session.helperId);
        if (helper?.toLowerCase().includes(query)) return true;
        
        const setWriter = getCoachName(session.setWriterId);
        if (setWriter?.toLowerCase().includes(query)) return true;
        
        // Search in location
        if (getLocationName(session.locationId).toLowerCase().includes(query)) return true;
        
        // Search in session focus
        if (session.focus.toLowerCase().includes(query)) return true;
        
        // Search in session content
        if (session.content) {
          const plainContent = stripHtml(session.content);
          if (plainContent.toLowerCase().includes(query)) return true;
        }
        
        return false;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sessions, searchQuery, squads, coaches, locations]);

  // Don't show results if showResultsOnly is true and no search query
  if (showResultsOnly && !searchQuery.trim()) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sessions by squad, coach, content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Search Input */}
      <div className="flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions by squad, coach, content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex-shrink-0 text-sm text-muted-foreground">
        {searchQuery ? (
          <span>Found {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}</span>
        ) : (
          <span>Showing all {filteredSessions.length} sessions</span>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No sessions found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const squad = squads.find(s => s.id === session.squadId);
            const leadCoach = getCoachName(session.leadCoachId);
            const contentExcerpt = searchQuery 
              ? getContentExcerpt(session.content || '', searchQuery)
              : null;
            const plainContent = session.content ? stripHtml(session.content) : '';
            const displayContent = contentExcerpt || plainContent.substring(0, 100);

            return (
              <div
                key={session.id}
                onClick={() => onSessionClick(session)}
                className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {highlightText(getSquadName(session.squadId), searchQuery)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{format(session.date, 'MMM dd, yyyy')}</span>
                      <span>•</span>
                      <span>{session.startTime}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {highlightText(session.focus, searchQuery)}
                  </Badge>
                </div>

                {/* Coach Info */}
                {searchQuery && leadCoach?.toLowerCase().includes(searchQuery.toLowerCase()) && (
                  <div className="text-sm mb-2">
                    <span className="text-muted-foreground">Coach: </span>
                    {highlightText(leadCoach, searchQuery)}
                  </div>
                )}

                {/* Content Preview */}
                {displayContent && (
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {highlightText(displayContent, searchQuery)}
                    {!contentExcerpt && plainContent.length > 100 && '...'}
                  </div>
                )}

                {/* No content indicator */}
                {!session.content && (
                  <div className="text-sm text-muted-foreground italic">
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
