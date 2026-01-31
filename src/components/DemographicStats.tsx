import { DemographicCounts, DetectionResult } from '@/types/ad';
import { Users, User, UserCircle2, Baby, Briefcase, AlertTriangle, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemographicStatsProps {
  demographics: DemographicCounts;
  recentDetections: DetectionResult[];
  isCapturing: boolean;
}

export const DemographicStats = ({
  demographics,
  recentDetections,
  isCapturing,
}: DemographicStatsProps) => {
  const totalGender = demographics.male + demographics.female;
  const totalAge = demographics.kid + demographics.young + demographics.adult;

  const malePercent = totalGender > 0 ? (demographics.male / totalGender) * 100 : 50;
  const kidPercent = totalAge > 0 ? (demographics.kid / totalAge) * 100 : 33;
  const youngPercent = totalAge > 0 ? (demographics.young / totalAge) * 100 : 33;
  const adultPercent = totalAge > 0 ? (demographics.adult / totalAge) * 100 : 34;

  // Get average confidence
  const avgConfidence = recentDetections.length > 0 
    ? recentDetections.reduce((sum, d) => sum + d.confidence, 0) / recentDetections.length
    : 0;

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Audience Demographics</h3>
        <div className={cn(
          "flex items-center gap-2 transition-colors",
          isCapturing ? "text-primary" : "text-muted-foreground"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isCapturing ? "bg-primary animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-sm font-medium">
            {isCapturing ? 'Live' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Gender Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gender Distribution</span>
          <span className="font-display font-medium">
            {totalGender} viewer{totalGender !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<User className="h-5 w-5" />}
            label="Male"
            value={demographics.male}
            color="primary"
            isActive={demographics.male >= demographics.female && totalGender > 0}
          />
          <StatCard
            icon={<UserCircle2 className="h-5 w-5" />}
            label="Female"
            value={demographics.female}
            color="accent"
            isActive={demographics.female > demographics.male}
          />
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${malePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{malePercent.toFixed(0)}% Male</span>
          <span>{(100 - malePercent).toFixed(0)}% Female</span>
        </div>
      </div>

      {/* Age Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Age Distribution</span>
          <span className="font-display font-medium">
            {totalAge} viewer{totalAge !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Smile className="h-5 w-5" />}
            label="Kid"
            sublabel="< 13 years"
            value={demographics.kid}
            color="info"
            isActive={demographics.kid >= demographics.young && demographics.kid >= demographics.adult && totalAge > 0}
          />
          <StatCard
            icon={<Baby className="h-5 w-5" />}
            label="Young"
            sublabel="13-34 years"
            value={demographics.young}
            color="success"
            isActive={demographics.young > demographics.kid && demographics.young >= demographics.adult && totalAge > 0}
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Adult"
            sublabel="35+ years"
            value={demographics.adult}
            color="warning"
            isActive={demographics.adult > demographics.kid && demographics.adult > demographics.young}
          />
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-info transition-all duration-500"
            style={{ width: `${kidPercent}%` }}
          />
          <div 
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${youngPercent}%` }}
          />
          <div 
            className="h-full bg-warning transition-all duration-500"
            style={{ width: `${adultPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{kidPercent.toFixed(0)}% Kid</span>
          <span>{youngPercent.toFixed(0)}% Young</span>
          <span>{adultPercent.toFixed(0)}% Adult</span>
        </div>
      </div>

      {/* Recent Detections with Confidence */}
      {recentDetections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Current Viewers</h4>
            <ConfidenceBadge confidence={avgConfidence} />
          </div>
          <div className="flex flex-wrap gap-2">
            {recentDetections.map((det, i) => (
              <DetectionBadge key={i} detection={det} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: number;
  color: 'primary' | 'accent' | 'success' | 'warning' | 'info';
  isActive: boolean;
}

const StatCard = ({ icon, label, sublabel, value, color, isActive }: StatCardProps) => {
  const colorClasses = {
    primary: 'text-primary bg-primary/10 border-primary/30',
    accent: 'text-accent bg-accent/10 border-accent/30',
    success: 'text-success bg-success/10 border-success/30',
    warning: 'text-warning bg-warning/10 border-warning/30',
    info: 'text-info bg-info/10 border-info/30',
  };

  return (
    <div className={cn(
      "p-3 rounded-xl border-2 transition-all duration-300",
      isActive 
        ? colorClasses[color]
        : "bg-muted/50 border-border text-muted-foreground"
    )}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <div>
          <span className="font-medium text-sm">{label}</span>
          {sublabel && (
            <span className="block text-[10px] opacity-70">{sublabel}</span>
          )}
        </div>
      </div>
      <div className={cn(
        "text-2xl font-display font-bold",
        isActive && "animate-count"
      )}>
        {value}
      </div>
    </div>
  );
};

interface DetectionBadgeProps {
  detection: DetectionResult;
  index: number;
}

const DetectionBadge = ({ detection, index }: DetectionBadgeProps) => {
  const isLowConfidence = detection.confidence < 0.75;
  const isMediumConfidence = detection.confidence >= 0.75 && detection.confidence < 0.85;
  
  const getAgeGroupColor = () => {
    switch (detection.ageGroup) {
      case 'kid': return 'text-info';
      case 'young': return 'text-success';
      case 'adult': return 'text-warning';
    }
  };

  return (
    <div
      className={cn(
        "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 animate-slide-up border",
        detection.gender === 'male' 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-accent/10 border-accent/30',
        isLowConfidence && 'opacity-60 border-dashed',
        isMediumConfidence && 'opacity-80'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isLowConfidence && (
        <AlertTriangle className="h-3 w-3 text-warning" />
      )}
      <Users className={cn(
        "h-3 w-3",
        detection.gender === 'male' ? 'text-primary' : 'text-accent'
      )} />
      <span className={cn(
        "capitalize",
        detection.gender === 'male' ? 'text-primary' : 'text-accent'
      )}>
        {detection.gender}
      </span>
      <span className="text-muted-foreground">•</span>
      <span className={cn("capitalize", getAgeGroupColor())}>
        {detection.ageGroup}
      </span>
      <span className={cn(
        "ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
        detection.confidence >= 0.85 
          ? 'bg-success/20 text-success'
          : detection.confidence >= 0.75
            ? 'bg-warning/20 text-warning'
            : 'bg-destructive/20 text-destructive'
      )}>
        {(detection.confidence * 100).toFixed(0)}%
      </span>
    </div>
  );
};

interface ConfidenceBadgeProps {
  confidence: number;
}

const ConfidenceBadge = ({ confidence }: ConfidenceBadgeProps) => {
  const getLabel = () => {
    if (confidence >= 0.85) return 'High Confidence';
    if (confidence >= 0.75) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      confidence >= 0.85 
        ? 'bg-success/20 text-success'
        : confidence >= 0.75
          ? 'bg-warning/20 text-warning'
          : 'bg-destructive/20 text-destructive'
    )}>
      {confidence < 0.75 && <AlertTriangle className="h-3 w-3" />}
      <span>{getLabel()}</span>
      <span className="font-bold">{(confidence * 100).toFixed(0)}%</span>
    </div>
  );
};
