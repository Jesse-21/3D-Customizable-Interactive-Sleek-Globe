import { useState } from "react";
import { GlobeSettings } from "@/hooks/useGlobeSettings";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";

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
  
  const toggleControls = () => {
    setIsOpen(!isOpen);
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
          className="text-white rounded-full p-1 hover:bg-white/10 transition-colors"
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
          
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <Label htmlFor="auto-rotate" className="text-xs text-indigo-200">Auto Rotate</Label>
            <Switch 
              id="auto-rotate"
              checked={settings.autoRotate}
              onCheckedChange={onAutoRotateChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobeControls;
