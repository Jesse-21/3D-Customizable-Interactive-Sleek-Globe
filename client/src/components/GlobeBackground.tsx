import { useEffect, useRef, useState } from "react";
import { GlobeSettings, RGBColor, LocationCoordinates } from "@/hooks/useGlobeSettings";
import createGlobe from "cobe";

interface GlobeBackgroundProps {
  settings: GlobeSettings;
}

// Define a marker object for visitor locations
interface LocationMarker {
  location: [number, number]; // [latitude, longitude]
  size: number;
  color: [number, number, number]; // RGB values normalized to 0-1
  timestamp: number; // Used to track when the marker was added
}

// Define custom options for COBE
interface CustomCOBEOptions {
  devicePixelRatio: number;
  width: number;
  height: number;
  phi: number;
  theta: number;
  dark: number;
  diffuse: number;
  mapSamples: number;
  mapBrightness: number;
  baseColor: [number, number, number];
  markerColor: [number, number, number];
  glowColor: [number, number, number];
  scale: number;
  pointSize?: number;
  opacity?: number; // Add opacity option
  markers: LocationMarker[];
  onRender: (state: any) => void;
}

const GlobeBackground = ({ settings }: GlobeBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const thetaRef = useRef(0);
  
  // For visitor markers
  const [visitorMarkers, setVisitorMarkers] = useState<LocationMarker[]>([]);
  
  // Use any type to avoid TypeScript issues with the cobe library
  const globeInstanceRef = useRef<any>(null);
  
  // For automatic marker generation
  const markerGenerationTimerRef = useRef<number | null>(null);
  
  // Helper function to validate and normalize coordinates
  const validateCoordinates = (lat: number, lng: number): [number, number] => {
    // Constrain latitude to -85 to 85 degrees (avoid poles for better visibility)
    const validLat = Math.max(-85, Math.min(85, lat));
    // Constrain longitude to -180 to 180 degrees
    const validLng = ((lng + 540) % 360) - 180;
    return [validLat, validLng];
  };
  
  // Helper function to generate random coordinates biased toward populated areas
  const generateRandomVisitorLocation = (): LocationCoordinates => {
    // Simple approximation of populated areas by continent
    const populatedRegions = [
      // North America
      { minLat: 25, maxLat: 50, minLng: -130, maxLng: -70, weight: 0.2 },
      // Europe
      { minLat: 35, maxLat: 60, minLng: -10, maxLng: 30, weight: 0.3 },
      // Asia
      { minLat: 10, maxLat: 50, minLng: 70, maxLng: 140, weight: 0.35 },
      // Australia
      { minLat: -40, maxLat: -10, minLng: 110, maxLng: 155, weight: 0.05 },
      // South America
      { minLat: -40, maxLat: 10, minLng: -80, maxLng: -40, weight: 0.1 }
    ];
    
    // Select a region based on its weight
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedRegion = populatedRegions[0];
    
    for (const region of populatedRegions) {
      cumulativeWeight += region.weight;
      if (random <= cumulativeWeight) {
        selectedRegion = region;
        break;
      }
    }
    
    // Generate a random coordinate within the selected region
    const lat = selectedRegion.minLat + Math.random() * (selectedRegion.maxLat - selectedRegion.minLat);
    const lng = selectedRegion.minLng + Math.random() * (selectedRegion.maxLng - selectedRegion.minLng);
    
    return [lat, lng];
  };

  // Get visitor's location when component mounts
  useEffect(() => {
    // Check if user location is stored in localStorage and if it's not older than 30 days
    const storedLocation = localStorage.getItem('visitorLocation');
    const shouldShowMarkers = settings.showVisitorMarkers;
    
    if (storedLocation) {
      try {
        const { location, timestamp } = JSON.parse(storedLocation);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - timestamp > thirtyDaysInMs;
        
        if (isExpired) {
          // Reset markers after 30 days
          localStorage.removeItem('visitorLocation');
          setVisitorMarkers([]);
        } else if (shouldShowMarkers) {
          // Use stored location if available and not expired
          setVisitorMarkers([{
            location: location,
            size: 0.1,
            color: [1, 0.5, 0], // Orange color for visitor dot
            timestamp: timestamp
          }]);
        }
      } catch (e) {
        console.error("Error parsing stored location:", e);
        localStorage.removeItem('visitorLocation');
      }
    } else if (navigator.geolocation && shouldShowMarkers) {
      // Get current location if permission is granted
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Validate coordinates before creating marker
          const [validLat, validLng] = validateCoordinates(
            position.coords.latitude,
            position.coords.longitude
          );
          
          const newMarker: LocationMarker = {
            location: [validLat, validLng],
            size: 0.1,
            color: [1, 0.5, 0], // Orange color for visitor dot
            timestamp: Date.now()
          };
          
          // Save to localStorage
          localStorage.setItem('visitorLocation', JSON.stringify({
            location: [position.coords.latitude, position.coords.longitude],
            timestamp: Date.now()
          }));
          
          setVisitorMarkers([newMarker]);
        },
        (error) => {
          console.log("Geolocation error or permission denied:", error);
          
          // Use timezone to approximate location
          const timezoneOffset = new Date().getTimezoneOffset();
          // Generate a random location biased by timezone
          const approximateLocation = generateRandomVisitorLocation();
          
          // Validate approximate location coordinates
          const [validLat, validLng] = validateCoordinates(
            approximateLocation[0],
            approximateLocation[1]
          );
          
          const newMarker: LocationMarker = {
            location: [validLat, validLng],
            size: 0.1,
            color: [1, 0.5, 0], // Orange color for visitor dot
            timestamp: Date.now()
          };
          
          setVisitorMarkers([newMarker]);
        }
      );
    }
  }, [settings.showVisitorMarkers]);

  // Setup automatic visitor marker generation
  useEffect(() => {
    // Clean up any existing generation timer
    if (markerGenerationTimerRef.current !== null) {
      clearInterval(markerGenerationTimerRef.current);
      markerGenerationTimerRef.current = null;
    }
    
    // If marker generation is enabled, set it up
    if (settings.showVisitorMarkers) {
      // Generate a new random visitor every 5-8 seconds
      markerGenerationTimerRef.current = window.setInterval(() => {
        // Limit the number of markers to prevent performance issues
        // Maximum of 12 markers at any time
        if (visitorMarkers.length >= 12) {
          // Remove the oldest marker when we hit the limit
          setVisitorMarkers(prev => prev.slice(1));
        }
        
        // Generate a new random location
        const newLocation = generateRandomVisitorLocation();
        const [validLat, validLng] = validateCoordinates(newLocation[0], newLocation[1]);
        
        // Create a new marker with a slightly random size and color variation
        const sizeVariation = Math.random() * 0.05 + 0.05; // Size between 0.05 and 0.1
        const hueVariation = Math.random() * 0.3; // Slight color variation
        
        const newMarker: LocationMarker = {
          location: [validLat, validLng],
          size: sizeVariation,
          // Vary the color slightly for visual interest
          color: [
            0.8 + hueVariation, // Red component
            0.4 + hueVariation, // Green component
            hueVariation,       // Blue component
          ],
          timestamp: Date.now()
        };
        
        // Add the new marker to the existing set
        setVisitorMarkers(prev => [...prev, newMarker]);
      }, 5000 + Math.random() * 3000); // Random interval between 5-8 seconds
    }
    
    // Cleanup on unmount
    return () => {
      if (markerGenerationTimerRef.current !== null) {
        clearInterval(markerGenerationTimerRef.current);
        markerGenerationTimerRef.current = null;
      }
    };
  }, [settings.showVisitorMarkers, visitorMarkers.length]);
  
  // Function to create the globe
  const initGlobe = () => {
    if (!canvasRef.current) return;
    
    try {
      console.log("Initializing globe with settings:", settings);
      
      // Store the starting position
      let currentPhi = phiRef.current;
      let currentTheta = thetaRef.current;
      
      // Using a fixed point size for consistency and visibility
      // This ensures the land dots are always visible at different screen sizes
      
      // Set up COBE options
      const options: CustomCOBEOptions = {
        devicePixelRatio: 2, // Set fixed device pixel ratio for consistent quality
        width: Math.min(window.innerWidth, 1200), // Limited width to avoid excessive details
        height: Math.min(window.innerHeight, 1200), // Limited height to avoid excessive details
        phi: currentPhi,
        theta: currentTheta,
        dark: 0.3, // Minimal darkness for better visibility of landmass
        diffuse: 1.8, // Higher diffuse for better visibility of dots
        mapSamples: 24000, // Higher sample count for better land definition
        mapBrightness: 16.0, // Much higher brightness to ensure land dots are visible
        baseColor: [...settings.landColor],
        markerColor: [1, 0.8, 0.5], // Warm marker base
        glowColor: [...settings.haloColor],
        scale: settings.globeSize,
        pointSize: 2.0, // Increased point size to ensure visibility
        opacity: settings.opacity, // Use the opacity setting
        markers: visitorMarkers,
        onRender: (state) => {
          // Auto rotation when not interacting
          if (settings.autoRotate && pointerInteracting.current === null) {
            // Apply rotation speed based on settings
            // This factor adjusts how fast the globe spins
            const rotationFactor = settings.rotationSpeed / 100;
            state.phi += rotationFactor;
          }
          
          // Keep track of current rotation for reinitializing
          phiRef.current = state.phi;
          thetaRef.current = state.theta;
        }
      };
      
      // Create globe instance using the imported createGlobe function
      const globe = createGlobe(canvasRef.current, options);
      
      // Store instance for cleanup
      globeInstanceRef.current = globe;
      
      console.log("Globe instance created successfully");
      
      return globe;
    } catch (error) {
      console.error("Error initializing globe:", error);
      return undefined;
    }
  };
  
  // Initialize and setup the globe
  useEffect(() => {
    // Initialize globe
    const globeInstance = initGlobe();
    
    // Handle window resize to ensure the globe remains responsive
    const handleResize = () => {
      if (globeInstanceRef.current) {
        // Call the destroy method on the globe instance
        if (typeof globeInstanceRef.current.destroy === 'function') {
          globeInstanceRef.current.destroy();
        }
        globeInstanceRef.current = initGlobe();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeInstanceRef.current) {
        if (typeof globeInstanceRef.current.destroy === 'function') {
          globeInstanceRef.current.destroy();
        }
      }
    };
  }, [settings, visitorMarkers]); // Re-create when settings or markers change
  
  // Handle pointer interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX;
    pointerInteractionMovement.current = 0;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      pointerInteracting.current = e.clientX;
      
      // Make sensitivity adjustable, using the setting to control how responsive the globe is
      const adjustedDelta = delta * (settings.mouseSensitivity / 40);
      phiRef.current -= adjustedDelta / 100;
    }
  };
  
  const handlePointerUp = () => {
    pointerInteracting.current = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };
  
  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    pointerInteracting.current = touch.clientX;
    pointerInteractionMovement.current = 0;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (pointerInteracting.current === null || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const delta = touch.clientX - pointerInteracting.current;
    pointerInteractionMovement.current = delta;
    pointerInteracting.current = touch.clientX;
    
    // Make sensitivity adjustable, similar to pointer movement
    const adjustedDelta = delta * (settings.mouseSensitivity / 40);
    phiRef.current -= adjustedDelta / 100;
  };
  
  const handleTouchEnd = () => {
    pointerInteracting.current = null;
  };

  return (
    <div 
      style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        width: "100%", 
        height: "100%", 
        background: "linear-gradient(135deg, #060c21 0%, #0a0a2c 100%)",
        zIndex: 0,
        overflow: "hidden"
      }}
    >
      {/* Enhanced glow effect layer that scales with globe size */}
      <div
        style={{
          position: "absolute",
          top: `calc(50% + ${settings.offsetY}%)`,
          left: `calc(50% + ${settings.offsetX}%)`,
          transform: "translate(-50%, -50%)",
          width: `${Math.min(100, 70 * settings.globeSize)}vh`, 
          height: `${Math.min(100, 70 * settings.globeSize)}vh`, 
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(40,120,220,0.15) 0%, rgba(20,80,200,0.08) 40%, rgba(0,0,0,0) 70%)",
          boxShadow: "0 0 120px 15px rgba(30,70,180,0.1)",
          zIndex: 0,
          pointerEvents: "none"
        }}
      />
      
      {/* Main globe canvas - with sized dimensions for better quality and control */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: `calc(50% + ${settings.offsetY}%)`,
          left: `calc(50% + ${settings.offsetX}%)`,
          transform: "translate(-50%, -50%)",
          width: `${Math.min(100, 90 * settings.globeSize)}vw`, 
          height: `${Math.min(100, 90 * settings.globeSize)}vh`,
          cursor: "grab",
          touchAction: "none",
          zIndex: 1
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
};

export default GlobeBackground;