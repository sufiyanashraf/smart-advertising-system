import { useState } from 'react';
import { AdMetadata } from '@/types/ad';
import { 
  FolderPlus, 
  Trash2, 
  Tag, 
  Video, 
  User, 
  UserCircle2, 
  Baby, 
  Briefcase,
  Smile,
  Plus,
  X,
  Check,
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdManagerProps {
  ads: AdMetadata[];
  onAdsChange: (ads: AdMetadata[]) => void;
  captureStartPercent: number;
  captureEndPercent: number;
}

export const AdManager = ({ 
  ads, 
  onAdsChange, 
  captureStartPercent, 
  captureEndPercent 
}: AdManagerProps) => {
  const [open, setOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdMetadata | null>(null);
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);
  const [newAd, setNewAd] = useState<Partial<AdMetadata>>({
    title: '',
    gender: 'all',
    ageGroup: 'all',
    duration: 30,
    videoUrl: '',
  });

  // Auto-detect video duration when URL changes
  const detectVideoDuration = async (url: string) => {
    if (!url) return;
    
    setIsLoadingDuration(true);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          const duration = Math.round(video.duration);
          if (duration > 0 && duration < 3600) {
            setNewAd(prev => ({ ...prev, duration }));
          }
          resolve();
        };
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = url;
      });
    } catch (error) {
      console.log('Could not auto-detect duration:', error);
    } finally {
      setIsLoadingDuration(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setNewAd({ ...newAd, videoUrl: url });
    if (url && url.startsWith('http')) {
      detectVideoDuration(url);
    }
  };

  const handleRemoveAd = (id: string) => {
    const ad = ads.find(a => a.id === id);
    onAdsChange(ads.filter(a => a.id !== id));
    toast.success(`Removed "${ad?.title}"`);
  };

  const handleUpdateAd = (updatedAd: AdMetadata) => {
    onAdsChange(ads.map(a => a.id === updatedAd.id ? updatedAd : a));
    setEditingAd(null);
    toast.success(`Updated "${updatedAd.title}"`);
  };

  const handleAddUrl = () => {
    if (!newAd.videoUrl || !newAd.title) {
      toast.error('Please enter both title and video URL');
      return;
    }

    const duration = newAd.duration || 15;
    const captureStart = Math.floor(duration * captureStartPercent / 100);
    const captureEnd = Math.floor(duration * captureEndPercent / 100);

    const ad: AdMetadata = {
      id: `ad-${Date.now()}`,
      filename: `${newAd.title}.mp4`,
      title: newAd.title,
      gender: (newAd.gender as 'male' | 'female' | 'all') || 'all',
      ageGroup: (newAd.ageGroup as 'kid' | 'young' | 'adult' | 'all') || 'all',
      duration,
      captureStart,
      captureEnd,
      videoUrl: newAd.videoUrl,
    };

    onAdsChange([...ads, ad]);
    toast.success(`Added "${ad.title}"`);
    
    // Reset form
    setNewAd({
      title: '',
      gender: 'all',
      ageGroup: 'all',
      duration: 30,
      videoUrl: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderPlus className="h-4 w-4" />
          Manage Ads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Ad Library
          </DialogTitle>
          <DialogDescription>
            Upload video ads and configure their demographic targeting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Ad Section */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-4 border border-dashed border-border">
            <h4 className="font-medium flex items-center gap-2">
              <Link className="h-4 w-4 text-primary" />
              Add Ad from URL
            </h4>
            <p className="text-sm text-muted-foreground">
              Enter a video URL from external sources (e.g., direct MP4 links, CDN URLs).
            </p>

            {/* URL Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Ad title"
                value={newAd.title || ''}
                onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
              />
              <Input
                placeholder="Video URL (duration auto-detected)"
                value={newAd.videoUrl || ''}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
            </div>

            {/* Targeting Options */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Target Gender</label>
                <Select 
                  value={newAd.gender || 'all'} 
                  onValueChange={(v) => setNewAd({ ...newAd, gender: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Target Age</label>
                <Select 
                  value={newAd.ageGroup || 'all'} 
                  onValueChange={(v) => setNewAd({ ...newAd, ageGroup: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="kid">Kid (&lt;13)</SelectItem>
                    <SelectItem value="young">Young (13-34)</SelectItem>
                    <SelectItem value="adult">Adult (35+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Duration (s)
                  {isLoadingDuration && (
                    <span className="text-primary animate-pulse">detecting...</span>
                  )}
                </label>
                <Input
                  type="number"
                  min={5}
                  max={600}
                  value={newAd.duration || 30}
                  onChange={(e) => setNewAd({ ...newAd, duration: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>

            <Button 
              onClick={handleAddUrl} 
              disabled={!newAd.title || !newAd.videoUrl}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Ad from URL
            </Button>
          </div>

          {/* Ad List */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Current Ads ({ads.length})
              </span>
            </h4>

            {ads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No ads added yet. Upload or add a video URL above.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {ads.map((ad) => (
                  <div 
                    key={ad.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {editingAd?.id === ad.id ? (
                      // Edit mode
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <Input
                          value={editingAd.title}
                          onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                          className="col-span-2"
                        />
                        <Select 
                          value={editingAd.gender} 
                          onValueChange={(v) => setEditingAd({ ...editingAd, gender: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select 
                          value={editingAd.ageGroup} 
                          onValueChange={(v) => setEditingAd({ ...editingAd, ageGroup: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="kid">Kid</SelectItem>
                            <SelectItem value="young">Young</SelectItem>
                            <SelectItem value="adult">Adult</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ad.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <TargetBadge type="gender" value={ad.gender} />
                          <TargetBadge type="age" value={ad.ageGroup} />
                          <span className="text-xs text-muted-foreground">
                            {ad.duration}s • Capture: {ad.captureStart}s-{ad.captureEnd}s
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {editingAd?.id === ad.id ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleUpdateAd(editingAd)}
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingAd(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingAd(ad)}
                          >
                            <Tag className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveAd(ad.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
    return value === 'kid' ? <Smile className="h-3 w-3" />
         : value === 'young' ? <Baby className="h-3 w-3" /> 
         : value === 'adult' ? <Briefcase className="h-3 w-3" />
         : null;
  };

  const getColor = () => {
    if (type === 'gender') {
      return value === 'male' ? 'bg-primary/20 text-primary'
           : value === 'female' ? 'bg-accent/20 text-accent'
           : 'bg-muted text-muted-foreground';
    }
    return value === 'kid' ? 'bg-info/20 text-info'
         : value === 'young' ? 'bg-success/20 text-success'
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
