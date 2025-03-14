import { useState } from "react";
import { GlobeSettings } from "@/hooks/useGlobeSettings";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(true);
  
  const toggleControls = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-20 bg-[--control-bg] p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Globe Controls</h3>
        <button onClick={toggleControls} className="text-white opacity-70 hover:opacity-100">
          {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>
      
      {isOpen && (
        <div>
          <div className="mb-3">
            <Label htmlFor="rotation-speed" className="block text-xs mb-1">Rotation Speed</Label>
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
          
          <div className="mb-3">
            <Label htmlFor="mouse-sensitivity" className="block text-xs mb-1">Mouse Sensitivity</Label>
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
          
          <div className="mb-3">
            <Label htmlFor="dot-size" className="block text-xs mb-1">Dot Size</Label>
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
          
          <div className="mb-3">
            <Label htmlFor="globe-size" className="block text-xs mb-1">Globe Size</Label>
            <Slider 
              id="globe-size"
              min={0.5}
              max={1.5}
              step={0.05}
              value={[settings.globeSize]}
              onValueChange={(value) => onGlobeSizeChange(value[0])}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center mt-4">
            <Switch 
              id="auto-rotate"
              checked={settings.autoRotate}
              onCheckedChange={onAutoRotateChange}
              className="mr-2"
            />
            <Label htmlFor="auto-rotate" className="text-xs">Auto Rotate</Label>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobeControls;
