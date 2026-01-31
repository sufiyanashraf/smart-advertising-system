import { AdMetadata } from '@/types/ad';
import { List, Play, User, UserCircle2, Baby, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdQueueProps {
  queue: AdMetadata[];
  currentAdId: string | null;
}

export const AdQueue = ({ queue, currentAdId }: AdQueueProps) => {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          Ad Queue
        </h3>
        <span className="text-sm text-muted-foreground">
          {queue.length} ads
        </span>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin">
        {queue.map((ad, index) => {
          const isPlaying = ad.id === currentAdId;
          
          return (
            <div
              key={ad.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                isPlaying 
                  ? "bg-primary/20 border border-primary/40" 
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold",
                isPlaying 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground"
              )}>
                {isPlaying ? (
                  <Play className="h-4 w-4 fill-current" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  isPlaying && "text-primary"
                )}>
                  {ad.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <TargetBadge 
                    type="gender" 
                    value={ad.gender} 
                  />
                  <TargetBadge 
                    type="age" 
                    value={ad.ageGroup} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {ad.duration}s
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Top 2 ads selected based on detected demographics
        </p>
      </div>
    </div>
  );
};

interface TargetBadgeProps {
  type: 'gender' | 'age';
  value: string;
}

const TargetBadge = ({ type, value }: TargetBadgeProps) => {
  const getIcon = () => {
    if (type === 'gender') {
      return value === 'male' ? <User className="h-3 w-3" /> 
           : value === 'female' ? <UserCircle2 className="h-3 w-3" />
           : null;
    }
    return value === 'young' ? <Baby className="h-3 w-3" /> 
         : value === 'adult' ? <Briefcase className="h-3 w-3" />
         : null;
  };

  const getColor = () => {
    if (type === 'gender') {
      return value === 'male' ? 'bg-primary/20 text-primary'
           : value === 'female' ? 'bg-accent/20 text-accent'
           : 'bg-muted text-muted-foreground';
    }
    return value === 'young' ? 'bg-success/20 text-success'
         : value === 'adult' ? 'bg-warning/20 text-warning'
         : 'bg-muted text-muted-foreground';
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
      getColor()
    )}>
      {getIcon()}
      <span className="capitalize">{value}</span>
    </div>
  );
};
