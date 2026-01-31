import { useRef } from 'react';
import { Camera, Upload, Monitor, X, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputSourceMode } from '@/hooks/useWebcam';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InputSourceSelectorProps {
  currentMode: InputSourceMode;
  isActive: boolean;
  videoFileName: string | null;
  onSelectWebcam: () => void;
  onSelectVideoFile: (file: File) => void;
  onSelectScreenCapture: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const InputSourceSelector = ({
  currentMode,
  isActive,
  videoFileName,
  onSelectWebcam,
  onSelectVideoFile,
  onSelectScreenCapture,
  onStop,
  disabled = false,
}: InputSourceSelectorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectVideoFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getModeIcon = () => {
    switch (currentMode) {
      case 'webcam':
        return <Camera className="h-4 w-4" />;
      case 'video':
        return <FileVideo className="h-4 w-4" />;
      case 'screen':
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getModeLabel = () => {
    if (!isActive) return 'Select Source';
    switch (currentMode) {
      case 'webcam':
        return 'Webcam';
      case 'video':
        return videoFileName ? videoFileName.slice(0, 15) + (videoFileName.length > 15 ? '...' : '') : 'Video File';
      case 'screen':
        return 'Screen Capture';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className="flex items-center gap-2"
          >
            {getModeIcon()}
            <span className="hidden sm:inline">{getModeLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Detection Source</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={onSelectWebcam}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Camera className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Webcam</span>
              <span className="text-xs text-muted-foreground">Use device camera</span>
            </div>
            {isActive && currentMode === 'webcam' && (
              <span className="ml-auto text-xs text-primary">Active</span>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={triggerFileInput}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Upload Video</span>
              <span className="text-xs text-muted-foreground">MP4, WebM, etc.</span>
            </div>
            {isActive && currentMode === 'video' && (
              <span className="ml-auto text-xs text-primary">Active</span>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={onSelectScreenCapture}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Monitor className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Screen Capture</span>
              <span className="text-xs text-muted-foreground">Capture any window</span>
            </div>
            {isActive && currentMode === 'screen' && (
              <span className="ml-auto text-xs text-primary">Active</span>
            )}
          </DropdownMenuItem>
          
          {isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onStop}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <X className="h-4 w-4" />
                <span>Stop Source</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
