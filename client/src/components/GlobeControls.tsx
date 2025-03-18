import { useEffect, useState } from "react";
import { GlobeSettings, RGBColor, LocationCoordinates } from "@/hooks/useGlobeSettings";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, MapPin, RotateCcw, Settings, Zap, Palette, Share2 } from "lucide-react";

interface GlobeControlsProps {
  settings: GlobeSettings;
  onRotationSpeedChange: (value: number) => void;
  onMouseSensitivityChange: (value: number) => void;
  onDotSizeChange: (value: number) => void;
  onGlobeSizeChange: (value: number) => void;
  onAutoRotateChange: (value: boolean) => void;
  onLandColorChange: (value: RGBColor) => void;
  onHaloColorChange: (value: RGBColor) => void;
  onGlitchEffectChange: (value: boolean) => void;
  onShowArcsChange: (value: boolean) => void;
  onArcColorChange: (value: RGBColor) => void;
  onHeadquartersLocationChange: (value: LocationCoordinates) => void;
  onShowVisitorMarkersChange: (value: boolean) => void;
  onOpacityChange?: (value: number) => void;
  onOffsetXChange?: (value: number) => void;
  onOffsetYChange?: (value: number) => void;
}

const GlobeControls = ({
  settings,
  onRotationSpeedChange,
  onMouseSensitivityChange,
  onDotSizeChange,
  onGlobeSizeChange,
  onAutoRotateChange,
  onLandColorChange,
  onHaloColorChange,
  onGlitchEffectChange,
  onShowArcsChange,
  onArcColorChange,
  onHeadquartersLocationChange,
  onShowVisitorMarkersChange,
  onOffsetXChange,
  onOffsetYChange,
  onOpacityChange
}: GlobeControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showVisitorMarker, setShowVisitorMarker] = useState(
    localStorage.getItem('showLocationMarkers') !== 'false'
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'appearance' | 'connections' | 'position'>('basic');
  
  // Convert RGB array (0-1 values) to hex color for input fields
  const rgbToHex = (rgb: RGBColor): string => {
    const toHex = (value: number) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  };
  
  // Convert hex color to RGB array (0-1 values) for the settings
  const hexToRgb = (hex: string): RGBColor => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    return [r, g, b];
  };
  
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
  
  // Handle color input changes
  const handleLandColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hexColor = e.target.value;
    onLandColorChange(hexToRgb(hexColor));
  };
  
  const handleHaloColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hexColor = e.target.value;
    onHaloColorChange(hexToRgb(hexColor));
  };
  
  const handleArcColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hexColor = e.target.value;
    onArcColorChange(hexToRgb(hexColor));
  };
  
  // Common city coordinates to use as headquarters options
  const commonLocations = [
    { name: "San Francisco", coords: [37.7749, -122.4194] },
    { name: "New York", coords: [40.7128, -74.0060] },
    { name: "London", coords: [51.5074, -0.1278] },
    { name: "Tokyo", coords: [35.6762, 139.6503] },
    { name: "Sydney", coords: [-33.8688, 151.2093] },
    { name: "Singapore", coords: [1.3521, 103.8198] }
  ];
  
  return (
    <div className={`fixed bottom-4 right-4 z-20 ${isOpen ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/50'} p-4 rounded-lg shadow-lg border border-white/20 transition-all duration-300 ${isOpen ? 'w-80' : 'w-auto'}`}>
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
        <div className="mt-4">
          {/* Tab navigation */}
          <div className="flex border-b border-white/10 mb-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 py-2 px-3 text-xs font-medium ${activeTab === 'basic' ? 'text-indigo-300 border-b-2 border-indigo-500' : 'text-white/70 hover:text-white/90'}`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex-1 py-2 px-3 text-xs font-medium ${activeTab === 'appearance' ? 'text-indigo-300 border-b-2 border-indigo-500' : 'text-white/70 hover:text-white/90'}`}
            >
              Look
            </button>
            {/* Removed Arcs tab as it's no longer needed */}
            <button
              onClick={() => setActiveTab('position')}
              className={`flex-1 py-2 px-3 text-xs font-medium ${activeTab === 'position' ? 'text-indigo-300 border-b-2 border-indigo-500' : 'text-white/70 hover:text-white/90'}`}
            >
              Position
            </button>
          </div>
          
          {/* Basic settings tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
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
          
          {/* Appearance tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Palette className="h-3 w-3 text-indigo-300" />
                    <Label htmlFor="land-color" className="block text-xs text-indigo-200">Land Color</Label>
                  </div>
                  <input 
                    type="color"
                    id="land-color"
                    value={rgbToHex(settings.landColor)}
                    onChange={handleLandColorChange}
                    className="w-8 h-6 rounded overflow-hidden cursor-pointer"
                  />
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Color of continents and land masses on the globe
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Palette className="h-3 w-3 text-indigo-300" />
                    <Label htmlFor="halo-color" className="block text-xs text-indigo-200">Halo Color</Label>
                  </div>
                  <input 
                    type="color"
                    id="halo-color"
                    value={rgbToHex(settings.haloColor)}
                    onChange={handleHaloColorChange}
                    className="w-8 h-6 rounded overflow-hidden cursor-pointer"
                  />
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Color of the halo/glow around the globe
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="globe-opacity" className="block text-xs text-indigo-200">Globe Transparency</Label>
                  <span className="text-xs text-white/70">{Math.round(settings.opacity * 100)}%</span>
                </div>
                <Slider 
                  id="globe-opacity"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[settings.opacity]}
                  onValueChange={(value) => onOpacityChange && onOpacityChange(value[0])}
                  className="w-full"
                />
                <div className="text-xs text-white/50 mt-1">
                  Adjust the transparency of the globe
                </div>
              </div>
              
              {/* Removed glitch effect controls */}
              
              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    onLandColorChange([0.3, 0.3, 0.3]); // Default gray
                    onHaloColorChange([1, 1, 1]); // Default white
                  }}
                  className="py-1 px-2 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded"
                >
                  Classic
                </button>
                <button
                  onClick={() => {
                    onLandColorChange([0.1, 0.5, 0.8]); // Blue
                    onHaloColorChange([0.4, 0.8, 1]); // Light blue
                  }}
                  className="py-1 px-2 text-xs bg-blue-900/30 hover:bg-blue-800/40 text-blue-300 rounded"
                >
                  Ocean
                </button>
                <button
                  onClick={() => {
                    onLandColorChange([0.7, 0.2, 0.8]); // Purple
                    onHaloColorChange([0.9, 0.5, 1]); // Pink
                  }}
                  className="py-1 px-2 text-xs bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 rounded"
                >
                  Cosmic
                </button>
                <button
                  onClick={() => {
                    onLandColorChange([0.05, 0.8, 0.2]); // Green
                    onHaloColorChange([0.6, 1, 0.3]); // Lime
                  }}
                  className="py-1 px-2 text-xs bg-green-900/30 hover:bg-green-800/40 text-green-300 rounded"
                >
                  Matrix
                </button>
              </div>
            </div>
          )}
          
          {/* Position tab */}
          {activeTab === 'position' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="offset-x" className="block text-xs text-indigo-200">Horizontal Position</Label>
                  <span className="text-xs text-white/70">{settings.offsetX}%</span>
                </div>
                <Slider 
                  id="offset-x"
                  min={-50}
                  max={50}
                  step={1}
                  value={[settings.offsetX]}
                  onValueChange={(value) => onOffsetXChange && onOffsetXChange(value[0])}
                  className="w-full"
                />
                <div className="text-xs text-white/50 mt-1">
                  Adjust the horizontal position of the globe
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <Label htmlFor="offset-y" className="block text-xs text-indigo-200">Vertical Position</Label>
                  <span className="text-xs text-white/70">{settings.offsetY}%</span>
                </div>
                <Slider 
                  id="offset-y"
                  min={-50}
                  max={50}
                  step={1}
                  value={[settings.offsetY]}
                  onValueChange={(value) => onOffsetYChange && onOffsetYChange(value[0])}
                  className="w-full"
                />
                <div className="text-xs text-white/50 mt-1">
                  Adjust the vertical position of the globe
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    if (onOffsetXChange) onOffsetXChange(0);
                    if (onOffsetYChange) onOffsetYChange(0);
                  }}
                  className="py-1 px-2 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded"
                >
                  Center
                </button>
                <button
                  onClick={() => {
                    if (onOffsetXChange) onOffsetXChange(-30);
                    if (onOffsetYChange) onOffsetYChange(0);
                  }}
                  className="py-1 px-2 text-xs bg-blue-900/30 hover:bg-blue-800/40 text-blue-300 rounded"
                >
                  Left Side
                </button>
                <button
                  onClick={() => {
                    if (onOffsetXChange) onOffsetXChange(30);
                    if (onOffsetYChange) onOffsetYChange(0);
                  }}
                  className="py-1 px-2 text-xs bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 rounded"
                >
                  Right Side
                </button>
                <button
                  onClick={() => {
                    if (onOffsetXChange) onOffsetXChange(0);
                    if (onOffsetYChange) onOffsetYChange(-20);
                  }}
                  className="py-1 px-2 text-xs bg-green-900/30 hover:bg-green-800/40 text-green-300 rounded"
                >
                  Top
                </button>
              </div>
            </div>
          )}
          
          {/* Connections tab removed */}
        </div>
      )}
    </div>
  );
};

export default GlobeControls;
