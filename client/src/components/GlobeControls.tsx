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
  onShowVisitorMarkersChange
}: GlobeControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showVisitorMarker, setShowVisitorMarker] = useState(
    localStorage.getItem('showLocationMarkers') !== 'false'
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'appearance' | 'connections'>('basic');
  
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
            <button
              onClick={() => setActiveTab('connections')}
              className={`flex-1 py-2 px-3 text-xs font-medium ${activeTab === 'connections' ? 'text-indigo-300 border-b-2 border-indigo-500' : 'text-white/70 hover:text-white/90'}`}
            >
              Arcs
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
              
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <Label htmlFor="glitch-effect" className="text-xs text-indigo-200">Glitch Effect</Label>
                  </div>
                  <Switch 
                    id="glitch-effect"
                    checked={settings.glitchEffect}
                    onCheckedChange={onGlitchEffectChange}
                  />
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Adds a futuristic glitch effect that randomly distorts colors
                </div>
              </div>
              
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
          
          {/* Connections tab */}
          {activeTab === 'connections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-cyan-400" />
                  <Label htmlFor="show-arcs" className="text-xs text-indigo-200">Data Connection Arcs</Label>
                </div>
                <Switch 
                  id="show-arcs"
                  checked={settings.showArcs}
                  onCheckedChange={onShowArcsChange}
                />
              </div>
              <div className="text-xs text-white/50 mt-1">
                Show animated arcs connecting headquarters to visitor locations
              </div>
              
              {settings.showArcs && (
                <>
                  <div>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3 text-indigo-300" />
                        <Label htmlFor="arc-color" className="block text-xs text-indigo-200">Arc Color</Label>
                      </div>
                      <input 
                        type="color"
                        id="arc-color"
                        value={rgbToHex(settings.arcColor)}
                        onChange={handleArcColorChange}
                        className="w-8 h-6 rounded overflow-hidden cursor-pointer"
                      />
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      Color of the connection arcs and data packets
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-white/10">
                    <div className="mb-2">
                      <Label className="block text-xs text-indigo-200 mb-1">Headquarters Location</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {commonLocations.map((location) => (
                          <button
                            key={location.name}
                            onClick={() => onHeadquartersLocationChange(location.coords as LocationCoordinates)}
                            className={`py-1 px-2 text-xs ${
                              settings.headquartersLocation[0] === location.coords[0] && 
                              settings.headquartersLocation[1] === location.coords[1] 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60'
                            } rounded`}
                          >
                            {location.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-green-400" />
                      <Label htmlFor="show-visitor-markers" className="text-xs text-indigo-200">Visitor Markers</Label>
                    </div>
                    <Switch 
                      id="show-visitor-markers"
                      checked={settings.showVisitorMarkers}
                      onCheckedChange={onShowVisitorMarkersChange}
                    />
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    Show visitor position markers on the globe
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobeControls;
