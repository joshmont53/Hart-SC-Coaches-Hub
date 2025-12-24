import { useState, useEffect } from 'react';
import { SessionFeedback, FeedbackRatings } from '../types';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from './ui/utils';
import { toast } from 'sonner@2.0.3';

interface FeedbackCategory {
  key: keyof FeedbackRatings;
  name: string;
  whatItCaptures: string;
  whyItMatters: string;
  scoringGuide: { score: number; description: string }[];
}

const feedbackCategories: FeedbackCategory[] = [
  {
    key: 'engagement',
    name: 'Engagement',
    whatItCaptures: 'How actively and enthusiastically swimmers participated',
    whyItMatters: 'Engaged swimmers learn faster, retain more, and build positive training habits',
    scoringGuide: [
      { score: 10, description: 'Every swimmer fully engaged, asking questions, focused on learning' },
      { score: 7, description: 'Most swimmers engaged, some off-task moments' },
      { score: 4, description: 'Mixed engagement, frequent redirections needed' },
      { score: 1, description: 'Minimal engagement, swimmers disinterested' },
    ],
  },
  {
    key: 'effortAndIntent',
    name: 'Effort & Intent',
    whatItCaptures: 'How hard swimmers worked and their commitment to quality',
    whyItMatters: 'Consistent effort builds physical and mental resilience',
    scoringGuide: [
      { score: 10, description: 'Maximum effort on every rep, focused on hitting targets' },
      { score: 7, description: 'Good effort overall, occasional lapses' },
      { score: 4, description: 'Inconsistent effort, needs encouragement' },
      { score: 1, description: 'Low effort, not attempting targets' },
    ],
  },
  {
    key: 'enjoyment',
    name: 'Enjoyment',
    whatItCaptures: 'How much fun swimmers had while training',
    whyItMatters: 'Enjoyment sustains long-term participation and motivation',
    scoringGuide: [
      { score: 10, description: 'Swimmers clearly enjoying themselves, positive energy' },
      { score: 7, description: 'Generally positive mood, some enjoyment' },
      { score: 4, description: 'Neutral mood, no strong reactions' },
      { score: 1, description: 'Frustration or negativity from swimmers' },
    ],
  },
  {
    key: 'focus',
    name: 'Focus',
    whatItCaptures: 'How well swimmers maintained concentration',
    whyItMatters: 'Focus ensures technical cues are understood and executed',
    scoringGuide: [
      { score: 10, description: 'Complete focus throughout, minimal distractions' },
      { score: 7, description: 'Good focus with occasional wandering' },
      { score: 4, description: 'Easily distracted, difficulty maintaining attention' },
      { score: 1, description: 'Unable to focus, constant distractions' },
    ],
  },
  {
    key: 'techniqueQuality',
    name: 'Technique Quality',
    whatItCaptures: 'Overall standard of stroke mechanics during the session',
    whyItMatters: 'Good technique prevents injury and improves efficiency',
    scoringGuide: [
      { score: 10, description: 'Excellent technique maintained even when fatigued' },
      { score: 7, description: 'Good technique, some breakdown under fatigue' },
      { score: 4, description: 'Technique needs significant work' },
      { score: 1, description: 'Poor technique throughout' },
    ],
  },
  {
    key: 'sessionStructure',
    name: 'Session Structure',
    whatItCaptures: 'How well the session plan worked in practice',
    whyItMatters: 'Good structure maximizes training time and learning outcomes',
    scoringGuide: [
      { score: 10, description: 'Perfect pacing, smooth transitions, time used efficiently' },
      { score: 7, description: 'Generally well-structured, minor timing issues' },
      { score: 4, description: 'Some structural problems, lost time' },
      { score: 1, description: 'Poorly structured, significant issues' },
    ],
  },
];

interface FeedbackFormProps {
  sessionId: string;
  coachId: string;
  existingFeedback?: SessionFeedback;
  onSave: (feedback: Omit<SessionFeedback, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function FeedbackForm({ sessionId, coachId, existingFeedback, onSave }: FeedbackFormProps) {
  const [ratings, setRatings] = useState<FeedbackRatings>({
    engagement: 5,
    effortAndIntent: 5,
    enjoyment: 5,
    focus: 5,
    techniqueQuality: 5,
    sessionStructure: 5,
  });
  const [notes, setNotes] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Load existing feedback if available
  useEffect(() => {
    if (existingFeedback) {
      setRatings(existingFeedback.ratings);
      setNotes(existingFeedback.notes || '');
      setIsPrivate(existingFeedback.isPrivate);
      setIsSaved(true);
    }
  }, [existingFeedback]);

  const handleRatingChange = (key: keyof FeedbackRatings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    onSave({
      sessionId,
      coachId,
      isPrivate,
      ratings,
      notes: notes.trim() || undefined,
    });
    setIsSaved(true);
    toast.success('Feedback saved successfully');
  };

  const averageRating = Object.values(ratings).reduce((sum, val) => sum + val, 0) / Object.values(ratings).length;

  return (
    <div className="space-y-6">
      {/* Header with save indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h3>Session Feedback</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Rate the session across key coaching metrics
          </p>
        </div>
        {isSaved && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200">
            <Check className="h-4 w-4" />
            <span className="text-sm">Saved</span>
          </div>
        )}
      </div>

      {/* Average Rating Summary */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm">Average Rating</span>
          <div className="flex items-center gap-2">
            <div className="text-2xl" style={{ color: '#4B9A4A' }}>
              {averageRating.toFixed(1)}
            </div>
            <span className="text-sm text-muted-foreground">/ 10</span>
          </div>
        </div>
      </Card>

      {/* Rating Categories */}
      <div className="space-y-3">
        {feedbackCategories.map((category) => (
          <Card
            key={category.key}
            className={cn(
              'overflow-hidden transition-all',
              isSaved && 'bg-green-50/30 border-green-200'
            )}
          >
            <div className="p-4">
              {/* Category Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm">{category.name}</h4>
                    {isSaved && <Check className="h-3.5 w-3.5 text-green-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {category.whatItCaptures}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedCategory(expandedCategory === category.key ? null : category.key)}
                  className="h-7 w-7 p-0"
                >
                  {expandedCategory === category.key ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Rating Buttons */}
              <div className="grid grid-cols-10 gap-1.5 mb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleRatingChange(category.key, num)}
                    className={cn(
                      'aspect-square rounded-md flex items-center justify-center text-sm transition-all',
                      'hover:scale-110 active:scale-95',
                      ratings[category.key] === num
                        ? 'bg-[#4B9A4A] text-white shadow-md scale-110'
                        : 'bg-muted hover:bg-muted/70'
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Current Rating Display */}
              <div className="text-center">
                <span className="text-xs text-muted-foreground">
                  Current: <span style={{ color: '#4B9A4A' }}>{ratings[category.key]}/10</span>
                </span>
              </div>

              {/* Expanded Details */}
              {expandedCategory === category.key && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Why it matters:</strong> {category.whyItMatters}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-2"><strong>Scoring Guide:</strong></p>
                    <div className="space-y-2">
                      {category.scoringGuide.map((guide) => (
                        <div key={guide.score} className="flex gap-2 text-xs">
                          <span
                            className="flex-shrink-0 w-8 h-6 rounded flex items-center justify-center"
                            style={{
                              backgroundColor: guide.score >= 7 ? '#4B9A4A' : guide.score >= 4 ? '#f59e0b' : '#ef4444',
                              color: 'white',
                            }}
                          >
                            {guide.score}
                          </span>
                          <span className="text-muted-foreground">{guide.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Notes Section */}
      <div className="space-y-2">
        <Label htmlFor="feedback-notes">Additional Notes (Optional)</Label>
        <Textarea
          id="feedback-notes"
          placeholder="Add any additional observations, patterns, or insights about the session..."
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setIsSaved(false);
          }}
          rows={4}
          className={cn(isSaved && 'bg-green-50/30 border-green-200')}
        />
      </div>

      {/* Privacy Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="privacy-toggle">Keep Feedback Private</Label>
          <p className="text-xs text-muted-foreground">
            Private feedback is only visible to you. Uncheck to share with the session writer.
          </p>
        </div>
        <Switch
          id="privacy-toggle"
          checked={isPrivate}
          onCheckedChange={(checked) => {
            setIsPrivate(checked);
            setIsSaved(false);
          }}
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          style={{ backgroundColor: '#4B9A4A' }}
          className="text-white hover:opacity-90"
          disabled={isSaved}
        >
          {isSaved ? 'Saved' : 'Save Feedback'}
        </Button>
      </div>
    </div>
  );
}