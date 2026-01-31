import { useState, useCallback } from 'react';
import { AdMetadata } from '@/types/ad';
import { 
  List, 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronUp, 
  ChevronDown,
  RotateCcw,
  User,
  UserCircle2,
  Baby,
  Briefcase,
  Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ManualQueueEditorProps {
  availableAds: AdMetadata[];
  manualQueue: AdMetadata[];
  onQueueChange: (queue: AdMetadata[]) => void;
}

export const ManualQueueEditor = ({ 
  availableAds, 
  manualQueue, 
  onQueueChange 
}: ManualQueueEditorProps) => {
  const [selectedAdId, setSelectedAdId] = useState<string>('');

  const handleAddAd = useCallback(() => {
    if (!selectedAdId) return;
    const ad = availableAds.find(a => a.id === selectedAdId);
    if (ad) {
      onQueueChange([...manualQueue, ad]);
      setSelectedAdId('');
    }
  }, [selectedAdId, availableAds, manualQueue, onQueueChange]);

  const handleRemoveAd = useCallback((index: number) => {
    onQueueChange(manualQueue.filter((_, i) => i !== index));
  }, [manualQueue, onQueueChange]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newQueue = [...manualQueue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
    onQueueChange(newQueue);
  }, [manualQueue, onQueueChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === manualQueue.length - 1) return;
    const newQueue = [...manualQueue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    onQueueChange(newQueue);
  }, [manualQueue, onQueueChange]);

  const handleClearQueue = useCallback(() => {
    onQueueChange([]);
  }, [onQueueChange]);

  const getGenderIcon = (gender: string) => {
    if (gender === 'male') return <User className="h-3 w-3" />;
    if (gender === 'female') return <UserCircle2 className="h-3 w-3" />;
    return null;
  };

  const getAgeIcon = (age: string) => {
    if (age === 'kid') return <Smile className="h-3 w-3" />;
    if (age === 'young') return <Baby className="h-3 w-3" />;
    if (age === 'adult') return <Briefcase className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <List className="h-5 w-5 text-warning" />
          Manual Playlist
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {manualQueue.length} ads
          </span>
          {manualQueue.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearQueue}
              className="h-7 px-2 text-destructive hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Add Ad Selector */}
      <div className="flex gap-2">
        <Select value={selectedAdId} onValueChange={setSelectedAdId}>
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder="Select an ad to add..." />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {availableAds.map(ad => (
              <SelectItem key={ad.id} value={ad.id}>
                <span className="flex items-center gap-2">
                  <span className="truncate">{ad.title}</span>
                  <span className="text-muted-foreground text-xs">({ad.duration}s)</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          size="sm" 
          onClick={handleAddAd} 
          disabled={!selectedAdId}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Queue List */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin">
        {manualQueue.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No ads in playlist</p>
            <p className="text-xs mt-1">Add ads above to create your playlist</p>
          </div>
        ) : (
          manualQueue.map((ad, index) => (
            <div
              key={`${ad.id}-${index}`}
              className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              
              <div className="w-6 h-6 rounded-full bg-warning/20 text-warning flex items-center justify-center text-xs font-bold shrink-0">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{ad.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                    ad.gender === 'male' ? 'bg-primary/20 text-primary' :
                    ad.gender === 'female' ? 'bg-accent/20 text-accent' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {getGenderIcon(ad.gender)}
                    <span className="capitalize">{ad.gender}</span>
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                    ad.ageGroup === 'kid' ? 'bg-info/20 text-info' :
                    ad.ageGroup === 'young' ? 'bg-success/20 text-success' :
                    ad.ageGroup === 'adult' ? 'bg-warning/20 text-warning' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {getAgeIcon(ad.ageGroup)}
                    <span className="capitalize">{ad.ageGroup}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{ad.duration}s</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="h-7 w-7 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === manualQueue.length - 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAd(index)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {manualQueue.length > 0 
            ? `🔄 Playlist will loop continuously (${manualQueue.reduce((acc, ad) => acc + ad.duration, 0)}s total)`
            : 'Add ads to create a custom playlist'
          }
        </p>
      </div>
    </div>
  );
};
