import { LogEntry } from '@/types/ad';
import { Terminal, Camera, List, Info, Users, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface SystemLogsProps {
  logs: LogEntry[];
}

export const SystemLogs = ({ logs }: SystemLogsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'webcam':
        return <Camera className="h-3 w-3" />;
      case 'detection':
        return <Users className="h-3 w-3" />;
      case 'queue':
        return <List className="h-3 w-3" />;
      case 'ad':
        return <Play className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'webcam':
        return 'text-primary';
      case 'detection':
        return 'text-success';
      case 'queue':
        return 'text-warning';
      case 'ad':
        return 'text-accent';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Terminal className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">System Logs</h3>
      </div>

      <div 
        ref={scrollRef}
        className="h-[180px] overflow-y-auto space-y-1 font-mono text-xs pr-2"
      >
        {logs.length === 0 ? (
          <p className="text-muted-foreground">No logs yet...</p>
        ) : (
          logs.map((log, i) => (
            <div 
              key={i}
              className={cn(
                "flex items-start gap-2 py-1 px-2 rounded hover:bg-muted/50 transition-colors",
                i === 0 && "animate-fade-in bg-muted/30"
              )}
            >
              <span className="text-muted-foreground shrink-0">
                [{formatTime(log.timestamp)}]
              </span>
              <span className={cn("shrink-0", getColor(log.type))}>
                {getIcon(log.type)}
              </span>
              <span className={cn(
                "flex-1",
                log.message.startsWith('  ') 
                  ? 'text-muted-foreground' 
                  : 'text-foreground'
              )}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
