import { CaptureSessionSummary as SessionSummaryType } from '@/types/detection';
import { Users, User, UserCircle2, Smile, Baby, Briefcase, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaptureSessionSummaryProps {
  summary: SessionSummaryType | null;
  isVisible: boolean;
}

export const CaptureSessionSummary = ({ summary, isVisible }: CaptureSessionSummaryProps) => {
  if (!isVisible || !summary) return null;

  const duration = summary.endedAt 
    ? Math.round((summary.endedAt - summary.startedAt) / 1000)
    : 0;

  const totalGender = summary.demographics.male + summary.demographics.female;
  const totalAge = summary.demographics.kid + summary.demographics.young + summary.demographics.adult;

  return (
    <div className="glass-card p-4 space-y-4 border-2 border-success/30 bg-success/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <h4 className="font-display font-semibold text-sm">Capture Summary</h4>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{duration}s • {summary.totalFrames} frames</span>
        </div>
      </div>

      {/* Unique Viewers Count */}
      <div className="flex items-center justify-center gap-2 py-2 bg-background/50 rounded-lg">
        <Users className="h-6 w-6 text-primary" />
        <span className="text-2xl font-display font-bold text-primary">
          {summary.uniqueViewers}
        </span>
        <span className="text-sm text-muted-foreground">
          unique viewer{summary.uniqueViewers !== 1 ? 's' : ''} detected
        </span>
      </div>

      {/* Demographics Grid */}
      {totalGender > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon={<User className="h-4 w-4" />}
            label="Male"
            value={summary.demographics.male}
            total={totalGender}
            color="primary"
          />
          <SummaryCard
            icon={<UserCircle2 className="h-4 w-4" />}
            label="Female"
            value={summary.demographics.female}
            total={totalGender}
            color="accent"
          />
        </div>
      )}

      {totalAge > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard
            icon={<Smile className="h-4 w-4" />}
            label="Kid"
            value={summary.demographics.kid}
            total={totalAge}
            color="info"
            compact
          />
          <SummaryCard
            icon={<Baby className="h-4 w-4" />}
            label="Young"
            value={summary.demographics.young}
            total={totalAge}
            color="success"
            compact
          />
          <SummaryCard
            icon={<Briefcase className="h-4 w-4" />}
            label="Adult"
            value={summary.demographics.adult}
            total={totalAge}
            color="warning"
            compact
          />
        </div>
      )}

      {summary.uniqueViewers === 0 && (
        <div className="text-center text-sm text-muted-foreground py-2">
          No stable viewers detected in this capture window
        </div>
      )}
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: 'primary' | 'accent' | 'success' | 'warning' | 'info';
  compact?: boolean;
}

const SummaryCard = ({ icon, label, value, total, color, compact }: SummaryCardProps) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const isActive = value > 0;

  const colorClasses = {
    primary: 'text-primary bg-primary/10 border-primary/30',
    accent: 'text-accent bg-accent/10 border-accent/30',
    success: 'text-success bg-success/10 border-success/30',
    warning: 'text-warning bg-warning/10 border-warning/30',
    info: 'text-info bg-info/10 border-info/30',
  };

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      compact ? "p-2" : "p-3",
      isActive ? colorClasses[color] : "bg-muted/50 border-border text-muted-foreground"
    )}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={cn("font-display font-bold", compact ? "text-lg" : "text-xl")}>
          {value}
        </span>
        <span className="text-xs text-muted-foreground">({percent}%)</span>
      </div>
    </div>
  );
};
