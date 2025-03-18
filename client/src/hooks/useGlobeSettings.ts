import { useState } from "react";

// RGB color type with values between 0-1
export type RGBColor = [number, number, number];

// Location coordinates [latitude, longitude]
export type LocationCoordinates = [number, number];

export interface GlobeSettings {
  rotationSpeed: number;
  mouseSensitivity: number;
  dotSize: number;
  globeSize: number;
  autoRotate: boolean;
  landColor: RGBColor;
  haloColor: RGBColor;
  glitchEffect: boolean;
  showArcs: boolean;
  arcColor: RGBColor;
  // Arc animation settings
  arcAltitude: number; // How high arcs go (0.1-1)
  arcAnimationSpeed: number; // Speed of arc animations (0.1-2)
  arcDensity: number; // How many arcs to show (1-10)
  headquartersLocation: LocationCoordinates;
  showVisitorMarkers: boolean;
  // Transparency of the globe (0-1)
  opacity: number;
  // Globe positioning
  offsetX: number; // Horizontal position offset in percentage (-50 to 50)
  offsetY: number; // Vertical position offset in percentage (-50 to 50)
}

export const useGlobeSettings = () => {
  const [settings, setSettings] = useState<GlobeSettings>(() => {
    // Check if we're on the home page to apply different default settings
    const isHomePage = window.location.pathname === '/';
    
    return {
      rotationSpeed: 0.8,
      mouseSensitivity: 40,
      dotSize: 1.0, // Increased dot size for better visibility
      // Make the globe appropriate size for visibility and quality
      globeSize: isHomePage ? 1.5 : 1.3, // Slightly smaller globe size
      autoRotate: true,
      landColor: [1.0, 1.0, 1.0], // Pure white for maximum visibility in dark background
      haloColor: [0.8, 0.8, 1.0], // Slightly blue-tinted halo
      glitchEffect: false,
      showArcs: false,
      arcColor: [0.3, 0.7, 1.0], // Bright blue arcs
      // Arc animation settings
      arcAltitude: 0.4, // Medium height arcs
      arcAnimationSpeed: 0.8, // Medium animation speed
      arcDensity: 5, // Moderate number of arcs
      headquartersLocation: [37.7749, -122.4194], // Default: San Francisco
      showVisitorMarkers: true,  // Show visitor markers by default
      // Default opacity for the globe
      opacity: 1.0,
      // Position globe properly on screen (adjusted to center the window)
      offsetX: -12,  
      // Move globe higher on the screen
      offsetY: -15
    };
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
  
  const updateLandColor = (color: RGBColor) => {
    setSettings(prev => ({ ...prev, landColor: color }));
  };
  
  const updateHaloColor = (color: RGBColor) => {
    setSettings(prev => ({ ...prev, haloColor: color }));
  };
  
  const updateGlitchEffect = (value: boolean) => {
    setSettings(prev => ({ ...prev, glitchEffect: value }));
  };
  
  const updateShowArcs = (value: boolean) => {
    setSettings(prev => ({ ...prev, showArcs: value }));
  };
  
  const updateArcColor = (color: RGBColor) => {
    setSettings(prev => ({ ...prev, arcColor: color }));
  };
  
  const updateArcAltitude = (value: number) => {
    // Clamp between 0.1 and 1
    const clampedValue = Math.max(0.1, Math.min(1, value));
    setSettings(prev => ({ ...prev, arcAltitude: clampedValue }));
  };
  
  const updateArcAnimationSpeed = (value: number) => {
    // Clamp between 0.1 and 2
    const clampedValue = Math.max(0.1, Math.min(2, value));
    setSettings(prev => ({ ...prev, arcAnimationSpeed: clampedValue }));
  };
  
  const updateArcDensity = (value: number) => {
    // Clamp between 1 and 10, and ensure it's an integer
    const clampedValue = Math.max(1, Math.min(10, Math.round(value)));
    setSettings(prev => ({ ...prev, arcDensity: clampedValue }));
  };
  
  const updateHeadquartersLocation = (location: LocationCoordinates) => {
    setSettings(prev => ({ ...prev, headquartersLocation: location }));
  };
  
  const updateShowVisitorMarkers = (value: boolean) => {
    setSettings(prev => ({ ...prev, showVisitorMarkers: value }));
  };
  
  const updateOffsetX = (value: number) => {
    // Clamp value between -50 and 50
    const clampedValue = Math.max(-50, Math.min(50, value));
    setSettings(prev => ({ ...prev, offsetX: clampedValue }));
  };
  
  const updateOffsetY = (value: number) => {
    // Clamp value between -50 and 50
    const clampedValue = Math.max(-50, Math.min(50, value));
    setSettings(prev => ({ ...prev, offsetY: clampedValue }));
  };
  
  const updateOpacity = (value: number) => {
    // Clamp value between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, value));
    setSettings(prev => ({ ...prev, opacity: clampedValue }));
  };
  
  // Helper function to convert hex color to RGB array (values 0-1)
  const hexToRgb = (hex: string): RGBColor => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    return [r, g, b];
  };
  
  // Helper function to convert RGB array to hex color
  const rgbToHex = (rgb: RGBColor): string => {
    const toHex = (value: number) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  };
  
  return {
    settings,
    updateRotationSpeed,
    updateMouseSensitivity,
    updateDotSize,
    updateGlobeSize,
    updateAutoRotate,
    updateLandColor,
    updateHaloColor,
    updateGlitchEffect,
    updateShowArcs,
    updateArcColor,
    updateArcAltitude,
    updateArcAnimationSpeed,
    updateArcDensity,
    updateHeadquartersLocation,
    updateShowVisitorMarkers,
    updateOffsetX,
    updateOffsetY,
    updateOpacity,
    hexToRgb,
    rgbToHex
  };
};
