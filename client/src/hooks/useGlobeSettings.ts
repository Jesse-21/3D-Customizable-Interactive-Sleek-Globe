import { useState } from "react";

export interface GlobeSettings {
  rotationSpeed: number;
  mouseSensitivity: number;
  dotSize: number;
  globeSize: number;
  autoRotate: boolean;
}

export const useGlobeSettings = () => {
  const [settings, setSettings] = useState<GlobeSettings>({
    rotationSpeed: 3,
    mouseSensitivity: 40,
    dotSize: 0.5,
    globeSize: 1.1,
    autoRotate: true
  });
  
  const updateRotationSpeed = (value: number) => {
    setSettings(prev => ({ ...prev, rotationSpeed: value }));
  };
  
  const updateMouseSensitivity = (value: number) => {
    setSettings(prev => ({ ...prev, mouseSensitivity: value }));
  };
  
  const updateDotSize = (value: number) => {
    setSettings(prev => ({ ...prev, dotSize: value }));
  };
  
  const updateGlobeSize = (value: number) => {
    setSettings(prev => ({ ...prev, globeSize: value }));
  };
  
  const updateAutoRotate = (value: boolean) => {
    setSettings(prev => ({ ...prev, autoRotate: value }));
  };
  
  return {
    settings,
    updateRotationSpeed,
    updateMouseSensitivity,
    updateDotSize,
    updateGlobeSize,
    updateAutoRotate
  };
};
