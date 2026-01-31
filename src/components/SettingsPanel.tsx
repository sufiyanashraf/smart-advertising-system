import { useState, useEffect } from 'react';
import { Settings, Percent, Eye, Zap, MonitorPlay, BarChart3, HelpCircle, Download, Check, Loader2 } from 'lucide-react';
import { getYoloModelStatus, downloadAndCacheYoloModel, clearCachedModel, DownloadProgress } from '@/utils/yoloModelDownloader';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type DetectionMode = 'fast' | 'accurate' | 'max';
export type VideoQuality = 'hd' | 'lowQuality' | 'nightIR' | 'crowd';

interface CaptureSettings {
  startPercent: number;
  endPercent: number;
  detectionSensitivity: number;
  detectionMode: DetectionMode;
  videoQuality: VideoQuality;
  /** Hard floor for face-score to reduce false positives (walls/sky). */
  falsePositiveMinScore: number;
  /** Minimum gender/age confidence to be counted in demographics + session summary. */
  minDemographicConfidence: number;
  /** Female boost factor to counter male bias (0-0.3). */
  femaleBoostFactor: number;
  /** Enable hair-based gender heuristics. */
  enableHairHeuristics: boolean;
  /** Require face texture variation (filters walls/uniform surfaces). */
  requireFaceTexture: boolean;
  /** Use dual model (TinyFace + SSD) for video files. */
  useDualModelForVideo: boolean;
  /** Enable YOLO detection for video files. */
  enableYoloForVideo: boolean;
}

interface SettingsPanelProps {
  settings: CaptureSettings;
  onSettingsChange: (settings: CaptureSettings) => void;
}

// Helper component for info tooltips
const InfoTooltip = ({ text }: { text: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[250px] text-xs">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const SettingsPanel = ({ settings, onSettingsChange }: SettingsPanelProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [open, setOpen] = useState(false);
  
  // YOLO model status
  const [yoloStatus, setYoloStatus] = useState<{ hasLocal: boolean; hasCached: boolean } | null>(null);
  const [yoloDownloading, setYoloDownloading] = useState(false);
  const [yoloProgress, setYoloProgress] = useState<DownloadProgress | null>(null);
  
  // Check YOLO model status when dialog opens
  useEffect(() => {
    if (open) {
      getYoloModelStatus().then(setYoloStatus);
    }
  }, [open]);
  
  const handleDownloadYolo = async () => {
    setYoloDownloading(true);
    const success = await downloadAndCacheYoloModel(undefined, setYoloProgress);
    if (success) {
      const status = await getYoloModelStatus();
      setYoloStatus(status);
    }
    setYoloDownloading(false);
  };
  
  const handleClearYoloCache = async () => {
    await clearCachedModel();
    const status = await getYoloModelStatus();
    setYoloStatus(status);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    setOpen(false);
  };

  const handleSensitivityChange = (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, detectionSensitivity: value[0] }));
  };

  const handleStartChange = (value: number[]) => {
    const newStart = value[0];
    setLocalSettings(prev => ({
      ...prev,
      startPercent: newStart,
      endPercent: Math.max(prev.endPercent, newStart + 5),
    }));
  };

  const handleEndChange = (value: number[]) => {
    const newEnd = value[0];
    setLocalSettings(prev => ({
      ...prev,
      endPercent: newEnd,
      startPercent: Math.min(prev.startPercent, newEnd - 5),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">System Settings</DialogTitle>
          <DialogDescription>
            Configure detection mode, sensitivity, and capture window. Hover over <HelpCircle className="h-3 w-3 inline" /> for explanations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Detection Mode */}
          <div className="space-y-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              Detection Mode
              <InfoTooltip text="How hard the system tries to find faces. 'Fast' = quick but may miss some. 'Accurate' = balanced for CCTV. 'Maximum' = catches everyone but slower." />
            </Label>
            <Select
              value={localSettings.detectionMode}
              onValueChange={(value: DetectionMode) => 
                setLocalSettings(prev => ({ ...prev, detectionMode: value }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast (Webcam)</SelectItem>
                <SelectItem value="accurate">Accurate (CCTV)</SelectItem>
                <SelectItem value="max">Maximum (Crowd)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              🎯 Fast = webcam chats, Accurate = security cameras, Maximum = busy public spaces
            </p>
          </div>

          {/* Video Quality */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Label className="flex items-center gap-2">
              <MonitorPlay className="h-4 w-4 text-primary" />
              Video Quality Preset
              <InfoTooltip text="Tell the system what kind of camera you're using. Pick 'Low Quality CCTV' for old security cameras, 'Night/IR' for dark footage, 'Crowd' for busy scenes." />
            </Label>
            <Select
              value={localSettings.videoQuality}
              onValueChange={(value: VideoQuality) => 
                setLocalSettings(prev => ({ ...prev, videoQuality: value }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hd">HD (720p+)</SelectItem>
                <SelectItem value="lowQuality">Low Quality CCTV</SelectItem>
                <SelectItem value="nightIR">Night/IR Camera</SelectItem>
                <SelectItem value="crowd">Crowd Detection</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              📹 Helps the system adjust processing for your camera type
            </p>
          </div>

          {/* Sensitivity */}
          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Detection Threshold
                <InfoTooltip text="Lower = detects more faces (including faint/small ones) but may detect walls or objects. Higher = stricter, only obvious faces." />
              </Label>
              <span className="text-sm text-primary font-bold">
                {localSettings.detectionSensitivity.toFixed(2)} (lower = more faces)
              </span>
            </div>
            <Slider
              value={[localSettings.detectionSensitivity]}
              onValueChange={handleSensitivityChange}
              min={0.15} max={0.5} step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              🔍 0.15 = catches everything (blurry/small) | 0.5 = strict (clear faces only)
            </p>
          </div>

          {/* False Positive Guard */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                False Positive Guard
                <InfoTooltip text="Stops the system from thinking walls, paintings, or objects are faces. Higher = stricter checking, fewer ghost faces but might miss real ones." />
              </Label>
              <span className="text-sm font-bold text-muted-foreground">
                {localSettings.falsePositiveMinScore.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[localSettings.falsePositiveMinScore]}
              onValueChange={(v) => setLocalSettings(prev => ({ ...prev, falsePositiveMinScore: v[0] }))}
              min={0.10} max={0.70} step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              🚫 Increase if you see "ghost" detections on walls or objects
            </p>
          </div>

          {/* Demographic Confidence */}
          <div className="space-y-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-accent" />
                Demographic Confidence
                <InfoTooltip text="How sure the system must be before counting someone as male/female/kid/adult. Higher = only count faces where we're very confident about who they are." />
              </Label>
              <span className="text-sm font-bold text-accent">
                {(localSettings.minDemographicConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[localSettings.minDemographicConfidence]}
              onValueChange={(v) => setLocalSettings(prev => ({ ...prev, minDemographicConfidence: v[0] }))}
              min={0.55} max={0.90} step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              📊 Only faces above this confidence get counted in demographics
            </p>
          </div>

          {/* Female Boost Factor */}
          <div className="space-y-2 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-pink-500" />
                Female Boost Factor
                <InfoTooltip text="The AI tends to guess 'male' too often. This slider helps balance it out. Higher = more likely to classify uncertain faces as female. Try 0.10-0.20 for most footage." />
              </Label>
              <span className="text-sm font-bold text-pink-500">
                {localSettings.femaleBoostFactor.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[localSettings.femaleBoostFactor]}
              onValueChange={(v) => setLocalSettings(prev => ({ ...prev, femaleBoostFactor: v[0] }))}
              min={0} max={0.30} step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              ⚖️ Counters AI's male bias. Increase if too many women are classified as men.
            </p>
          </div>

          {/* Hair Heuristics Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="space-y-0.5 flex-1">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Hair Detection Heuristics
                <InfoTooltip text="Uses hair length as a clue for gender. If someone has long hair extending past their shoulders, they're more likely female. Turn on for better female detection." />
              </Label>
              <p className="text-xs text-muted-foreground">
                💇 Analyzes hair region above face to help with gender
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enableHairHeuristics}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, enableHairHeuristics: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>

          {/* Face Texture Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="space-y-0.5 flex-1">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Require Face Texture
                <InfoTooltip text="Checks if the detection looks like real skin with natural variations. Helps filter out walls, flat surfaces, and uniform-colored objects that look like faces." />
              </Label>
              <p className="text-xs text-muted-foreground">
                🧱 Rejects flat/uniform surfaces (walls, paintings)
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.requireFaceTexture}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, requireFaceTexture: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>

          {/* Dual Model for Video Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="space-y-0.5 flex-1">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Dual Model (Video)
                <InfoTooltip text="Uses two AI models together (TinyFace for speed + SSD MobileNet for accuracy) when processing video files. Catches more faces but runs slower." />
              </Label>
              <p className="text-xs text-muted-foreground">
                🔄 TinyFace + SSD MobileNet for maximum detection
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.useDualModelForVideo}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, useDualModelForVideo: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>

          {/* YOLO for Video Toggle - Currently uses SSD as enhanced detector */}
          <div className="space-y-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  Enhanced Detection (Video)
                  <InfoTooltip text="Uses the high-accuracy SSD MobileNet model as the primary detector for video files. Best for CCTV footage with challenging conditions." />
                </Label>
                <p className="text-xs text-muted-foreground">
                  🎯 SSD MobileNet for better video/CCTV detection
                </p>
              </div>
              <input
                type="checkbox"
                checked={localSettings.enableYoloForVideo}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, enableYoloForVideo: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
            
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-yellow-500/20">
              💡 When enabled, uses SSD MobileNet as the primary detector instead of TinyFace. Slower but more accurate for difficult footage.
            </p>
          </div>

          {/* Capture Window */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Capture Window
              <InfoTooltip text="During ad playback, the camera only captures viewers during this portion of the video. Set 60%-100% to capture during the last 40% of each ad." />
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              📷 When to scan for viewers during each ad (e.g., 60%-100% = last 40%)
            </p>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs">Start</Label>
              <span className="text-sm text-primary font-bold">{localSettings.startPercent}%</span>
            </div>
            <Slider value={[localSettings.startPercent]} onValueChange={handleStartChange} min={10} max={90} step={5} />
            
            <div className="flex items-center justify-between">
              <Label className="text-xs">End</Label>
              <span className="text-sm text-accent font-bold">{localSettings.endPercent}%</span>
            </div>
            <Slider value={[localSettings.endPercent]} onValueChange={handleEndChange} min={20} max={98} step={2} />
            
            {/* Preview */}
            <div className="relative h-2 bg-background rounded-full overflow-hidden mt-2">
              <div 
                className="absolute h-full bg-gradient-to-r from-primary to-accent"
                style={{ left: `${localSettings.startPercent}%`, width: `${localSettings.endPercent - localSettings.startPercent}%` }}
              />
            </div>
          </div>

          {/* Evaluation Dashboard Link */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <a 
              href="/admin/evaluation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Open Model Evaluation Dashboard
            </a>
            <p className="text-xs text-muted-foreground mt-1">
              📈 View detection accuracy metrics and confusion matrices
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export type { CaptureSettings };
