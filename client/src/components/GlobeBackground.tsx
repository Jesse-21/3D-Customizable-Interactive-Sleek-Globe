import { useEffect, useRef, useState } from "react";
import { GlobeSettings, RGBColor, LocationCoordinates } from "@/hooks/useGlobeSettings";
import createGlobe from "cobe";

// Helper function to convert lat/long to 3D point for arc visualization
function coordinatesToPoint(lat: number, lng: number, state: any, scale: number) {
  // Convert to radians
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  // Calculate 3D position
  const x = -scale * Math.sin(phi) * Math.cos(theta + state.phi);
  const y = scale * Math.cos(phi);
  const z = scale * Math.sin(phi) * Math.sin(theta + state.phi);
  
  // Check if point is visible (in front of the globe)
  if (z < 0) return null;
  
  // Project 3D point to 2D screen
  return {
    x: x * (window.innerWidth / 4),
    y: y * (window.innerHeight / 4)
  };
}

// Helper function for quadratic Bezier calculation for smooth arc animation
function quadraticBezier(t: number, p0: number, p1: number, p2: number) {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
}

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

// Define a connection arc between two points
interface ConnectionArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [number, number, number]; // RGB values normalized to 0-1
  progress: number; // Animation progress from 0 to 1
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
  // For arc data visualization
  const [connectionArcs, setConnectionArcs] = useState<ConnectionArc[]>([]);
  const arcAnimationRef = useRef<number | null>(null);
  const ctx2dRef = useRef<CanvasRenderingContext2D | null>(null);
  
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
  
  // Helper function to create a new connection arc
  const createNewConnectionArc = (): ConnectionArc => {
    const [startLat, startLng] = settings.headquartersLocation;
    const [endLat, endLng] = generateRandomVisitorLocation();
    
    return {
      startLat,
      startLng,
      endLat,
      endLng,
      color: [...settings.arcColor],
      progress: 0
    };
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
          
          // Use timezone to approximate location
          const timezoneOffset = new Date().getTimezoneOffset();
          // Generate a random location biased by timezone
          const approximateLocation = generateRandomVisitorLocation();
          
          const newMarker: LocationMarker = {
            location: approximateLocation, 
            size: 0.1,
            color: [1, 0.5, 0], // Orange color for visitor dot
            timestamp: Date.now()
          };
          
          setVisitorMarkers([newMarker]);
        }
      );
    }
  }, [settings.showVisitorMarkers]);
  
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
  
  // Handle the arc connection animation
  useEffect(() => {
    // Clean up existing animation
    if (arcAnimationRef.current !== null) {
      cancelAnimationFrame(arcAnimationRef.current);
      arcAnimationRef.current = null;
    }
    
    // Only setup arc animation if the feature is enabled
    if (!settings.showArcs) {
      setConnectionArcs([]);
      return;
    }
    
    // Initialize with a few arcs and setup the arc canvas
    if (connectionArcs.length === 0) {
      const initialArcs = Array.from({ length: 3 }, () => createNewConnectionArc());
      setConnectionArcs(initialArcs);
      
      // Set up the arc canvas dimensions
      const arcCanvas = document.getElementById('arcs-canvas') as HTMLCanvasElement;
      if (arcCanvas) {
        arcCanvas.width = window.innerWidth;
        arcCanvas.height = window.innerHeight;
        ctx2dRef.current = arcCanvas.getContext('2d');
      }
    }
    
    // Animation function for arcs
    const animateArcs = () => {
      // Clone the current arcs and update their progress
      const updatedArcs = connectionArcs.map(arc => {
        // Advance the animation progress
        const newProgress = arc.progress + 0.01;
        
        // If arc has completed its journey, replace it with a new one
        if (newProgress >= 1) {
          return createNewConnectionArc();
        }
        
        // Otherwise update its progress
        return {
          ...arc,
          progress: newProgress
        };
      });
      
      setConnectionArcs(updatedArcs);
      
      // Add a new arc occasionally 
      if (Math.random() < 0.01 && connectionArcs.length < 10) {
        setConnectionArcs(prev => [...prev, createNewConnectionArc()]);
      }
      
      // Continue the animation loop
      arcAnimationRef.current = requestAnimationFrame(animateArcs);
    };
    
    // Start the animation
    arcAnimationRef.current = requestAnimationFrame(animateArcs);
    
    // Cleanup on unmount or when settings change
    return () => {
      if (arcAnimationRef.current !== null) {
        cancelAnimationFrame(arcAnimationRef.current);
        arcAnimationRef.current = null;
      }
    };
  }, [settings.showArcs, settings.arcColor, settings.headquartersLocation, connectionArcs]);
  
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
          
          // Render data connection arcs if enabled
          if (settings.showArcs && connectionArcs.length > 0) {
            const ctx = ctx2dRef.current;
            if (!ctx) return;
            
            // Clear previous arcs
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Draw each connection arc
            connectionArcs.forEach(arc => {
              // Calculate current position along the arc based on progress
              const progress = arc.progress;
              
              // Calculate points in 3D space
              const fromPoint = coordinatesToPoint(arc.startLat, arc.startLng, state, options.scale);
              const toPoint = coordinatesToPoint(arc.endLat, arc.endLng, state, options.scale);
              
              // Draw arc using quadratic curve
              if (fromPoint && toPoint) {
                const startX = fromPoint.x + ctx.canvas.width / 2;
                const startY = fromPoint.y + ctx.canvas.height / 2;
                const endX = toPoint.x + ctx.canvas.width / 2;
                const endY = toPoint.y + ctx.canvas.height / 2;
                
                // Calculate control point (arc peak)
                const controlX = (startX + endX) / 2;
                const controlY = Math.min(startY, endY) - 100; // Arc height
                
                // Calculate current point along the path based on progress
                const currentX = quadraticBezier(progress, startX, controlX, endX);
                const currentY = quadraticBezier(progress, startY, controlY, endY);
                
                // Only draw up to current progress point
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.quadraticCurveTo(controlX, controlY, currentX, currentY);
                
                // Style based on arc color
                const [r, g, b] = arc.color;
                ctx.strokeStyle = `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, 0.75)`;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw "data packet" dot at the current position
                ctx.beginPath();
                ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)})`;
                ctx.fill();
              }
            });
          }
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
    
    // We're now handling all pointer and touch events at the container level
    // This provides better coordination between canvas layers
    // No need to set up individual event listeners on the canvas anymore
    
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
      // Only need to remove the resize listener since pointer events are now handled via React
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
  
  // Create an event handler for the container that manages all pointer events
  const handleContainerPointerEvents = (e: React.PointerEvent) => {
    // If this is a pointerdown event, start the interaction
    if (e.type === 'pointerdown') {
      pointerInteracting.current = e.clientX;
      pointerInteractionMovement.current = e.clientX;
      
      // Set cursor to indicate grabbing
      if (canvasRef.current) {
        canvasRef.current.style.setProperty('cursor', 'grabbing');
      }
    } 
    // If this is a pointerup or pointerleave event, end the interaction
    else if (e.type === 'pointerup' || e.type === 'pointerleave') {
      pointerInteracting.current = null;
      
      // Reset cursor
      if (canvasRef.current) {
        canvasRef.current.style.setProperty('cursor', e.type === 'pointerleave' ? 'auto' : 'grab');
      }
    } 
    // If this is a pointermove event, update the interaction if active
    else if (e.type === 'pointermove' && pointerInteracting.current !== null) {
      pointerInteractionMovement.current = e.clientX;
    }
  };
  
  // Handle touch events for mobile devices
  const handleContainerTouchEvents = (e: React.TouchEvent) => {
    // Touch start
    if (e.type === 'touchstart' && e.touches.length === 1) {
      e.preventDefault();
      pointerInteracting.current = e.touches[0].clientX;
      pointerInteractionMovement.current = e.touches[0].clientX;
    } 
    // Touch move
    else if (e.type === 'touchmove' && e.touches.length === 1 && pointerInteracting.current !== null) {
      e.preventDefault();
      pointerInteractionMovement.current = e.touches[0].clientX;
    } 
    // Touch end
    else if (e.type === 'touchend') {
      pointerInteracting.current = null;
    }
  };

  return (
    <div 
      style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        width: "100%", 
        height: "100%", 
        background: "#050818",
        zIndex: 0,
        overflow: "hidden"
      }}
      onPointerDown={handleContainerPointerEvents}
      onPointerMove={handleContainerPointerEvents}
      onPointerUp={handleContainerPointerEvents}
      onPointerLeave={handleContainerPointerEvents}
      onTouchStart={handleContainerTouchEvents}
      onTouchMove={handleContainerTouchEvents}
      onTouchEnd={handleContainerTouchEvents}
    >
      {/* Main globe canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%", 
          height: "100%",
          cursor: "grab",
          touchAction: "none",
          zIndex: 1
        }}
      />
      
      {/* Separate canvas for arc visualizations */}
      <canvas
        id="arcs-canvas"
        ref={(el) => {
          // Update the second canvas context reference
          if (el) {
            ctx2dRef.current = el.getContext('2d');
            // Ensure the canvas is the right size
            el.width = window.innerWidth;
            el.height = window.innerHeight;
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%", 
          height: "100%",
          pointerEvents: "none", // Allow interactions to pass through to the globe
          zIndex: 2
        }}
      />
    </div>
  );
};

export default GlobeBackground;
