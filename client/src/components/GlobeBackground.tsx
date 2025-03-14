import { useEffect, useRef, useState } from "react";
import { GlobeSettings } from "@/hooks/useGlobeSettings";
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
  markers: LocationMarker[];
  onRender: (state: any) => void;
}

// Define a type for the cleanup function returned by createGlobe
type CleanupFunction = () => void;

const GlobeBackground = ({ settings }: GlobeBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const thetaRef = useRef(0);
  const [visitorMarkers, setVisitorMarkers] = useState<LocationMarker[]>([]);
  // Use any type to avoid TypeScript issues with the cobe library
  const globeInstanceRef = useRef<any>(null);
  
  // Get visitor's location when component mounts
  useEffect(() => {
    // Check if user location is stored in localStorage and if it's not older than 30 days
    const storedLocation = localStorage.getItem('visitorLocation');
    const shouldShowMarkers = localStorage.getItem('showLocationMarkers') !== 'false';
    
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
          const newMarker: LocationMarker = {
            location: [position.coords.latitude, position.coords.longitude],
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
        }
      );
    }
  }, []);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    console.log("Attempting to initialize globe");
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Set canvas dimensions to match window
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    
    // Function to create the globe
    const initGlobe = () => {
      if (!canvasRef.current) return;
      
      try {
        console.log("Creating globe instance with settings:", settings);
        
        // Store the starting position
        let currentPhi = phiRef.current;
        
        // Define options for the globe
        const options: CustomCOBEOptions = {
          devicePixelRatio: 2,
          width: width,
          height: height,
          phi: currentPhi,
          theta: thetaRef.current,
          dark: 1,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: 6,
          baseColor: [0.3, 0.3, 0.3],
          markerColor: [0.1, 0.8, 1],
          glowColor: [1, 1, 1],
          scale: settings.globeSize,
          pointSize: settings.dotSize,
          markers: visitorMarkers,
          onRender: (state: any) => {
            // Auto rotation
            if (settings.autoRotate) {
              currentPhi += settings.rotationSpeed / 1000;
            }
            
            // When the user is interacting with the globe
            if (pointerInteracting.current !== null) {
              // Modify rotation based on pointer interaction
              const pointerPhiDiff = pointerInteracting.current - pointerInteractionMovement.current;
              currentPhi += pointerPhiDiff * (settings.mouseSensitivity / 200);
              pointerInteractionMovement.current = pointerInteracting.current;
            }
            
            // Update the rotation state
            state.phi = currentPhi;
            phiRef.current = currentPhi;
          }
        };
        
        // Initialize the globe with createGlobe from the imported package
        // Cast to any to avoid TypeScript errors with the library's type definitions
        globeInstanceRef.current = createGlobe(canvasRef.current, options as any);
        
        console.log("Globe instance created successfully");
        
        // Add mouse interaction handlers
        const onPointerDown = (e: PointerEvent) => {
          pointerInteracting.current = e.clientX;
          canvasRef.current?.style.setProperty('cursor', 'grabbing');
        };
        
        const onPointerUp = () => {
          pointerInteracting.current = null;
          canvasRef.current?.style.setProperty('cursor', 'grab');
        };
        
        const onPointerOut = () => {
          pointerInteracting.current = null;
          canvasRef.current?.style.setProperty('cursor', 'auto');
        };
        
        const onPointerMove = (e: PointerEvent) => {
          if (pointerInteracting.current !== null) {
            pointerInteractionMovement.current = e.clientX;
          }
        };
        
        // Add event listeners
        canvasRef.current.addEventListener('pointerdown', onPointerDown);
        canvasRef.current.addEventListener('pointerup', onPointerUp);
        canvasRef.current.addEventListener('pointerout', onPointerOut);
        canvasRef.current.addEventListener('pointermove', onPointerMove);
        
        // Return cleanup function for the event listeners
        return () => {
          if (canvasRef.current) {
            canvasRef.current.removeEventListener('pointerdown', onPointerDown);
            canvasRef.current.removeEventListener('pointerup', onPointerUp);
            canvasRef.current.removeEventListener('pointerout', onPointerOut);
            canvasRef.current.removeEventListener('pointermove', onPointerMove);
          }
        };
      } catch (error) {
        console.error("Error creating globe:", error);
        return undefined;
      }
    };
    
    // Initialize the globe and get the cleanup function for event listeners
    const cleanupEvents = initGlobe();
    
    // Handle resize
    const handleResize = () => {
      if (globeInstanceRef.current) {
        // Clean up old instance
        try {
          // The return value of createGlobe is a function that cleans up the instance
          if (typeof globeInstanceRef.current === 'function') {
            globeInstanceRef.current();
          }
        } catch (e) {
          console.error("Error cleaning up globe instance:", e);
        }
        
        globeInstanceRef.current = null;
        
        // Update canvas dimensions
        if (canvasRef.current) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight;
          
          // Recreate globe with new dimensions
          initGlobe();
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      // Cleanup event listeners
      if (cleanupEvents) cleanupEvents();
      window.removeEventListener('resize', handleResize);
      
      // Clean up globe instance
      if (globeInstanceRef.current) {
        try {
          // The return value of createGlobe is a function that cleans up the instance
          if (typeof globeInstanceRef.current === 'function') {
            globeInstanceRef.current();
          }
        } catch (e) {
          console.error("Error cleaning up globe instance:", e);
        }
        globeInstanceRef.current = null;
      }
    };
  }, [settings, visitorMarkers]); // Re-create when settings or markers change
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%", 
        height: "100%",
        background: "#050818",
        zIndex: 0,
        cursor: "grab",
        touchAction: "none"
      }}
    />
  );
};

export default GlobeBackground;
