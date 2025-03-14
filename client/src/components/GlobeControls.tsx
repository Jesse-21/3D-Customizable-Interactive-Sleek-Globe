import { useEffect, useState } from "react";
import { GlobeSettings } from "@/hooks/useGlobeSettings";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, MapPin, RotateCcw, Settings } from "lucide-react";

interface GlobeControlsProps {
  settings: GlobeSettings;
  onRotationSpeedChange: (value: number) => void;
  onMouseSensitivityChange: (value: number) => void;
  onDotSizeChange: (value: number) => void;
  onGlobeSizeChange: (value: number) => void;
  onAutoRotateChange: (value: boolean) => void;
}

const GlobeControls = ({
  settings,
  onRotationSpeedChange,
  onMouseSensitivityChange,
  onDotSizeChange,
  onGlobeSizeChange,
  onAutoRotateChange
}: GlobeControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showVisitorMarker, setShowVisitorMarker] = useState(
    localStorage.getItem('showLocationMarkers') !== 'false'
  );
  
  const toggleControls = () => {
    setIsOpen(!isOpen);
  };
  
  // Toggle visitor location marker
  const toggleVisitorMarker = () => {
    const newValue = !showVisitorMarker;
    setShowVisitorMarker(newValue);
    localStorage.setItem('showLocationMarkers', newValue ? 'true' : 'false');
    
    // Force reload to update the globe with or without markers
    window.location.reload();
  };
  
  // Reset visitor marker data (remove the 30-day marker)
  const resetVisitorData = () => {
    localStorage.removeItem('visitorLocation');
    // Force reload to update the globe
    window.location.reload();
  };
  
  return (
    <div className={`fixed bottom-4 right-4 z-20 ${isOpen ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/50'} p-4 rounded-lg shadow-lg border border-white/20 transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-medium text-white">Globe Controls</h3>
        </div>
        <button 
          onClick={toggleControls} 
          className="controls-toggle text-white rounded-full p-1 hover:bg-white/10 transition-colors"
          aria-label={isOpen ? "Close controls" : "Open controls"}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="rotation-speed" className="block text-xs text-indigo-200">Rotation Speed</Label>
              <span className="text-xs text-white/70">{settings.rotationSpeed.toFixed(1)}</span>
            </div>
            <Slider 
              id="rotation-speed"
              min={0}
              max={10}
              step={0.1}
              value={[settings.rotationSpeed]}
              onValueChange={(value) => onRotationSpeedChange(value[0])}
              className="w-full"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="mouse-sensitivity" className="block text-xs text-indigo-200">Mouse Sensitivity</Label>
              <span className="text-xs text-white/70">{settings.mouseSensitivity}</span>
            </div>
            <Slider 
              id="mouse-sensitivity"
              min={0}
              max={100}
              step={1}
              value={[settings.mouseSensitivity]}
              onValueChange={(value) => onMouseSensitivityChange(value[0])}
              className="w-full"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="dot-size" className="block text-xs text-indigo-200">Dot Size</Label>
              <span className="text-xs text-white/70">{settings.dotSize.toFixed(2)}</span>
            </div>
            <Slider 
              id="dot-size"
              min={0.1}
              max={2}
              step={0.05}
              value={[settings.dotSize]}
              onValueChange={(value) => onDotSizeChange(value[0])}
              className="w-full"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="globe-size" className="block text-xs text-indigo-200">Globe Size</Label>
              <span className="text-xs text-white/70">{settings.globeSize.toFixed(2)}</span>
            </div>
            <Slider 
              id="globe-size"
              min={0.5}
              max={3}
              step={0.05}
              value={[settings.globeSize]}
              onValueChange={(value) => onGlobeSizeChange(value[0])}
              className="w-full"
            />
          </div>
          
          <div className="pt-2 space-y-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-rotate" className="text-xs text-indigo-200">Auto Rotate</Label>
              <Switch 
                id="auto-rotate"
                checked={settings.autoRotate}
                onCheckedChange={onAutoRotateChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-orange-400" />
                <Label htmlFor="visitor-marker" className="text-xs text-indigo-200">Show Visitor Location</Label>
              </div>
              <Switch 
                id="visitor-marker"
                checked={showVisitorMarker}
                onCheckedChange={toggleVisitorMarker}
              />
            </div>
            
            {/* Button to reset visitor data */}
            {localStorage.getItem('visitorLocation') && (
              <button
                onClick={resetVisitorData}
                className="flex items-center justify-center gap-1 w-full mt-2 py-1.5 px-2 text-xs bg-indigo-900/30 hover:bg-indigo-800/40 text-indigo-200 rounded-md transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Visitor Data
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobeControls;
