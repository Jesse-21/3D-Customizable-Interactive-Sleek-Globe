import { useEffect, useRef, useState } from "react";
import { GlobeSettings, RGBColor } from "@/hooks/useGlobeSettings";
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
  // For glitch effect
  const glitchTimerRef = useRef<number | null>(null);
  const originalLandColorRef = useRef<RGBColor>(settings.landColor);
  const lastGlitchTimeRef = useRef<number>(0);
  
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
  
  // Handle glitch effect
  useEffect(() => {
    // Store original land color for reference
    originalLandColorRef.current = settings.landColor;
    
    // Clean up any existing glitch timer
    if (glitchTimerRef.current !== null) {
      clearInterval(glitchTimerRef.current);
      glitchTimerRef.current = null;
    }
    
    // If glitch effect is enabled, set up the glitch timer
    if (settings.glitchEffect) {
      // Glitch effect timer
      glitchTimerRef.current = window.setInterval(() => {
        if (!canvasRef.current || !globeInstanceRef.current) return;
        
        // Only glitch occasionally and randomly
        if (Math.random() > 0.1) return;
        
        // Calculate time since last glitch to avoid too frequent glitches
        const now = Date.now();
        if (now - lastGlitchTimeRef.current < 2000) return;
        lastGlitchTimeRef.current = now;
        
        // Create a temporary color distortion
        const glitchDuration = 100 + Math.random() * 300; // 100-400ms glitch
        
        // Apply the glitch by reinitializing the globe with distorted settings
        try {
          // Store the current cleanup function
          const cleanup = globeInstanceRef.current;
          
          // Create a new instance to cause a visual "glitch"
          if (typeof cleanup === 'function') {
            cleanup();
            
            // Force a small delay before recreating
            setTimeout(() => {
              if (canvasRef.current) {
                initGlobe(true); // Pass true to use glitch colors
                
                // Restore normal appearance after the glitch duration
                setTimeout(() => {
                  if (canvasRef.current) {
                    // Only reinitialize if glitch effect is still enabled
                    if (settings.glitchEffect) {
                      const cleanup = globeInstanceRef.current;
                      if (typeof cleanup === 'function') {
                        cleanup();
                        initGlobe(false); // Pass false to use normal colors
                      }
                    }
                  }
                }, glitchDuration);
              }
            }, 30);
          }
        } catch (e) {
          console.error("Error during glitch effect:", e);
        }
      }, 5000); // Check for glitch opportunity every 5 seconds
    }
    
    return () => {
      if (glitchTimerRef.current !== null) {
        clearInterval(glitchTimerRef.current);
        glitchTimerRef.current = null;
      }
    };
  }, [settings.glitchEffect, settings.landColor]);
  
  // Function to create the globe
  const initGlobe = (useGlitchColors = false) => {
    if (!canvasRef.current) return;
    
    try {
      console.log("Creating globe instance with settings:", settings);
      
      // Store the starting position
      let currentPhi = phiRef.current;
      let currentTheta = thetaRef.current;
      
      // Define land and glow colors (use glitch colors if requested)
      let baseColor: RGBColor = [...settings.landColor];
      let glowColor: RGBColor = [...settings.haloColor];
      
      // Apply glitch distortion if requested
      if (useGlitchColors) {
        // Create a distorted version of the land color
        baseColor = [
          Math.min(1, settings.landColor[0] + (Math.random() * 0.5 - 0.2)),
          Math.min(1, settings.landColor[1] + (Math.random() * 0.5 - 0.2)),
          Math.min(1, settings.landColor[2] + (Math.random() * 0.5 - 0.2)),
        ];
        
        // Create a distorted version of the glow color
        glowColor = [
          Math.min(1, settings.haloColor[0] + (Math.random() * 0.5 - 0.2)),
          Math.min(1, settings.haloColor[1] + (Math.random() * 0.5 - 0.2)),
          Math.min(1, settings.haloColor[2] + (Math.random() * 0.5 - 0.2)),
        ];
      }
      
      // Define options for the globe
      const options: CustomCOBEOptions = {
        devicePixelRatio: 2,
        width: window.innerWidth,
        height: window.innerHeight,
        phi: currentPhi,
        theta: currentTheta,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: baseColor,
        markerColor: [0.1, 0.8, 1],
        glowColor: glowColor,
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
            const pointerPhiDiff = (pointerInteracting.current - pointerInteractionMovement.current) * 
                                  (settings.mouseSensitivity / 200);
            currentPhi += pointerPhiDiff;
            pointerInteractionMovement.current = pointerInteracting.current;
          }
          
          // Update the rotation state
          state.phi = currentPhi;
          phiRef.current = currentPhi;
          state.theta = currentTheta;
          thetaRef.current = currentTheta;
        }
      };
      
      // Initialize the globe with createGlobe from the imported package
      // Cast to any to avoid TypeScript errors with the library's type definitions
      globeInstanceRef.current = createGlobe(canvasRef.current, options as any);
      
      console.log("Globe instance created successfully");
      
      // Return cleanup function for the event listeners
      return () => {
        // Event listeners will be set up separately
      };
    } catch (error) {
      console.error("Error creating globe:", error);
      return undefined;
    }
  };
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    console.log("Attempting to initialize globe");
    
    // Set canvas dimensions to match window
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;
    
    // Initialize the globe
    initGlobe();
    
    // Add pointer interaction handlers
    const onPointerDown = (e: PointerEvent) => {
      pointerInteracting.current = e.clientX;
      pointerInteractionMovement.current = e.clientX;
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
    
    // Add touch handlers specially for mobile devices
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        pointerInteracting.current = e.touches[0].clientX;
        pointerInteractionMovement.current = e.touches[0].clientX;
      }
    };
    
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && pointerInteracting.current !== null) {
        e.preventDefault();
        pointerInteractionMovement.current = e.touches[0].clientX;
      }
    };
    
    const onTouchEnd = () => {
      pointerInteracting.current = null;
    };
    
    // Add event listeners
    if (canvasRef.current) {
      canvasRef.current.addEventListener('pointerdown', onPointerDown);
      canvasRef.current.addEventListener('pointerup', onPointerUp);
      canvasRef.current.addEventListener('pointerout', onPointerOut);
      canvasRef.current.addEventListener('pointermove', onPointerMove);
      
      // Add touch-specific event listeners for better mobile support
      canvasRef.current.addEventListener('touchstart', onTouchStart);
      canvasRef.current.addEventListener('touchmove', onTouchMove, { passive: false });
      canvasRef.current.addEventListener('touchend', onTouchEnd);
    }
    
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
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('pointerdown', onPointerDown);
        canvasRef.current.removeEventListener('pointerup', onPointerUp);
        canvasRef.current.removeEventListener('pointerout', onPointerOut);
        canvasRef.current.removeEventListener('pointermove', onPointerMove);
        
        canvasRef.current.removeEventListener('touchstart', onTouchStart);
        canvasRef.current.removeEventListener('touchmove', onTouchMove);
        canvasRef.current.removeEventListener('touchend', onTouchEnd);
      }
      
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
      
      // Clean up glitch timer
      if (glitchTimerRef.current !== null) {
        clearInterval(glitchTimerRef.current);
        glitchTimerRef.current = null;
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
