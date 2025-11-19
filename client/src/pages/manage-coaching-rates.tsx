import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, DollarSign, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CoachingRate {
  qualificationLevel: string;
  hourlyRate: string;
  sessionWritingRate: string;
  createdAt: string;
  updatedAt: string;
}

interface ManageCoachingRatesProps {
  onBack: () => void;
}

export function ManageCoachingRates({ onBack }: ManageCoachingRatesProps) {
  const { toast } = useToast();
  
  const [editedRates, setEditedRates] = useState<Record<string, { hourlyRate: string; sessionWritingRate: string }>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: rates = [], isLoading } = useQuery<CoachingRate[]>({
    queryKey: ['/api/coaching-rates'],
  });

  // Initialize edited rates when data loads
  useEffect(() => {
    if (rates.length > 0 && Object.keys(editedRates).length === 0) {
      const initialRates: Record<string, { hourlyRate: string; sessionWritingRate: string }> = {};
      rates.forEach(rate => {
        initialRates[rate.qualificationLevel] = {
          hourlyRate: rate.hourlyRate,
          sessionWritingRate: rate.sessionWritingRate,
        };
      });
      setEditedRates(initialRates);
    }
  }, [rates, editedRates]);

  const updateMutation = useMutation({
    mutationFn: async (updatedRates: Array<{ qualificationLevel: string; hourlyRate: number; sessionWritingRate: number }>) => {
      return await apiRequest('PUT', '/api/coaching-rates', updatedRates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coaching-rates'] });
      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Coaching rates updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update coaching rates',
        variant: 'destructive',
      });
    },
  });

  const handleRateChange = (qualificationLevel: string, field: 'hourlyRate' | 'sessionWritingRate', value: string) => {
    setEditedRates(prev => ({
      ...prev,
      [qualificationLevel]: {
        ...prev[qualificationLevel],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate all rates
    const updates = Object.entries(editedRates).map(([qualificationLevel, values]) => {
      const hourlyRate = parseFloat(values.hourlyRate);
      const sessionWritingRate = parseFloat(values.sessionWritingRate);

      if (isNaN(hourlyRate) || hourlyRate < 0) {
        throw new Error(`Invalid hourly rate for ${qualificationLevel}`);
      }
      if (isNaN(sessionWritingRate) || sessionWritingRate < 0) {
        throw new Error(`Invalid session writing rate for ${qualificationLevel}`);
      }

      return {
        qualificationLevel,
        hourlyRate,
        sessionWritingRate,
      };
    });

    updateMutation.mutate(updates);
  };

  const handleReset = () => {
    const initialRates: Record<string, { hourlyRate: string; sessionWritingRate: string }> = {};
    rates.forEach(rate => {
      initialRates[rate.qualificationLevel] = {
        hourlyRate: rate.hourlyRate,
        sessionWritingRate: rate.sessionWritingRate,
      };
    });
    setEditedRates(initialRates);
    setHasChanges(false);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'No Qualification':
        return 'secondary';
      case 'Level 1':
        return 'default';
      case 'Level 2':
        return 'default';
      case 'Level 3':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manage Coaching Rates</h1>
            <p className="text-muted-foreground mt-1">
              Set hourly rates and session writing rates for each qualification level
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                data-testid="button-reset"
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changes to coaching rates will affect future invoice calculations. Existing invoice data for past months will not be affected.
        </AlertDescription>
      </Alert>

      {/* Rates Cards */}
      {isLoading ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading rates...</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rates
            .sort((a, b) => {
              const order = { 'No Qualification': 0, 'Level 1': 1, 'Level 2': 2, 'Level 3': 3 };
              return (order[a.qualificationLevel as keyof typeof order] || 99) - 
                     (order[b.qualificationLevel as keyof typeof order] || 99);
            })
            .map(rate => (
            <Card key={rate.qualificationLevel} data-testid={`card-rate-${rate.qualificationLevel.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {rate.qualificationLevel}
                  </CardTitle>
                  <Badge variant={getLevelColor(rate.qualificationLevel)}>
                    {rate.qualificationLevel}
                  </Badge>
                </div>
                <CardDescription>
                  Set rates for coaches at this qualification level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`hourly-${rate.qualificationLevel}`}>
                    Hourly Rate (£)
                  </Label>
                  <Input
                    id={`hourly-${rate.qualificationLevel}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedRates[rate.qualificationLevel]?.hourlyRate || ''}
                    onChange={(e) => handleRateChange(rate.qualificationLevel, 'hourlyRate', e.target.value)}
                    placeholder="0.00"
                    data-testid={`input-hourly-${rate.qualificationLevel.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`writing-${rate.qualificationLevel}`}>
                    Session Writing Rate (£)
                  </Label>
                  <Input
                    id={`writing-${rate.qualificationLevel}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedRates[rate.qualificationLevel]?.sessionWritingRate || ''}
                    onChange={(e) => handleRateChange(rate.qualificationLevel, 'sessionWritingRate', e.target.value)}
                    placeholder="0.00"
                    data-testid={`input-writing-${rate.qualificationLevel.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                </div>

                <div className="pt-2 border-t text-sm text-muted-foreground">
                  Last updated: {new Date(rate.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {rates.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Rate Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rates.map(rate => {
                const edited = editedRates[rate.qualificationLevel];
                const hourlyRate = edited ? parseFloat(edited.hourlyRate) : 0;
                const writingRate = edited ? parseFloat(edited.sessionWritingRate) : 0;

                return (
                  <div key={rate.qualificationLevel} className="space-y-1">
                    <p className="text-sm font-medium">{rate.qualificationLevel}</p>
                    <p className="text-xs text-muted-foreground">
                      Hourly: £{hourlyRate.toFixed(2)} | Writing: £{writingRate.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
