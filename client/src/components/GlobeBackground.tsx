import React, { useEffect, useRef, useState } from "react";
import { GlobeSettings, LocationCoordinates } from "@/hooks/useGlobeSettings";
import createGlobe from "cobe";
import { addWebSocketListener, sendWebSocketMessage, WebSocketMessage } from "@/lib/websocket";

// Define marker types for COBE that match exactly what the library expects
interface LocationMarker {
  location: [number, number];
  size: number;
  color: [number, number, number];
  timestamp: number; // Our custom property for tracking when markers were added
}

interface GlobeBackgroundProps {
  settings: GlobeSettings;
}

const GlobeBackground = ({ settings }: GlobeBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef<number>(0);
  const phiRef = useRef(0);
  const thetaRef = useRef(0);
  
  // For visitor markers
  const [visitorMarkers, setVisitorMarkers] = useState<LocationMarker[]>([]);
  
  // Use any type to avoid TypeScript issues with the cobe library
  const globeInstanceRef = useRef<any>(null);
  
  // For debugging
  const frameCountRef = useRef(0);
  // Create animation time reference for arc animations
  const arcAnimTimeRef = useRef<number>(Date.now());
  
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

  // Function to create a marker from location data
  const createMarker = (lat: number, lng: number, timestamp: number): LocationMarker => {
    const [validLat, validLng] = validateCoordinates(lat, lng);
    return {
      location: [validLat, validLng],
      size: 0.07, // Consistent small size
      color: [0.1, 0.8, 1], // Teal color for all visitors
      timestamp: timestamp
    };
  };

  // Handle visitor locations with WebSocket
  useEffect(() => {
    if (!settings.showVisitorMarkers) return;
    
    // Check if we have a stored location from previous session
    const storedLocationStr = localStorage.getItem('visitorLocation');
    if (storedLocationStr) {
      try {
        const storedData = JSON.parse(storedLocationStr);
        if (storedData.location && storedData.timestamp) {
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          const isExpired = Date.now() - storedData.timestamp > thirtyDaysInMs;
          
          if (isExpired) {
            localStorage.removeItem('visitorLocation');
          } else {
            // Add the marker
            const marker = createMarker(storedData.location[0], storedData.location[1], storedData.timestamp);
            setVisitorMarkers([marker]);
          }
        }
      } catch (e) {
        console.error("Error parsing stored location:", e);
        localStorage.removeItem('visitorLocation');
      }
    }
    
    // Set up WebSocket listener for visitor markers
    const removeListener = addWebSocketListener((message) => {
      if (message.type === 'visitor_location' && message.location) {
        // Add a new visitor marker
        const marker = createMarker(
          message.location.latitude,
          message.location.longitude,
          message.location.timestamp
        );
        
        setVisitorMarkers(prev => {
          const newMarkers = [...prev, marker];
          // Keep only the most recent 12 markers
          return newMarkers.length > 12 ? newMarkers.slice(-12) : newMarkers;
        });
      } 
      else if (message.type === 'initial_locations' && message.locations && message.locations.length > 0) {
        // Add all initial location markers
        const markers = message.locations.map(loc => 
          createMarker(loc.latitude, loc.longitude, loc.timestamp)
        );
        
        setVisitorMarkers(prev => {
          const newMarkers = [...prev, ...markers];
          // Keep only the most recent 12 markers
          return newMarkers.length > 12 ? newMarkers.slice(-12) : newMarkers;
        });
      }
    });
    
    // Get the visitor's own location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Send visitor location to the server
          sendWebSocketMessage({
            type: 'new_visitor',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          
          // Add the visitor's own marker
          const newMarker = createMarker(
            position.coords.latitude,
            position.coords.longitude,
            Date.now()
          );
          
          // Store the location in localStorage
          localStorage.setItem('visitorLocation', JSON.stringify({
            location: [position.coords.latitude, position.coords.longitude],
            timestamp: Date.now()
          }));
          
          setVisitorMarkers(prev => [...prev, newMarker]);
        },
        (error) => {
          console.log("Geolocation error or permission denied:", error);
          
          // Use an approximate location based on populated regions
          const approximateLocation = generateRandomVisitorLocation();
          
          // Send this approximate location
          sendWebSocketMessage({
            type: 'new_visitor',
            latitude: approximateLocation[0],
            longitude: approximateLocation[1]
          });
          
          // Add the marker locally
          const newMarker = createMarker(
            approximateLocation[0],
            approximateLocation[1],
            Date.now()
          );
          
          setVisitorMarkers(prev => [...prev, newMarker]);
        }
      );
    }
    
    // Cleanup
    return () => {
      removeListener();
    };
  }, [settings.showVisitorMarkers]);
  
  // Function to create the globe
  const initGlobe = () => {
    if (!canvasRef.current) return;
    
    try {
      console.log("Initializing globe with settings:", settings);
      
      // Store the starting position
      let currentPhi = phiRef.current;
      let currentTheta = thetaRef.current;
      
      // Set up COBE options with default values that ensure the land dots are visible
      const generateArcs = () => {
        if (!settings.showArcs) return [];
        
        // Define popular global cities for better arc distribution
        const popularCities: [number, number][] = [
          [40.7128, -74.0060], // New York
          [51.5074, -0.1278],  // London
          [35.6762, 139.6503], // Tokyo
          [-33.8688, 151.2093], // Sydney
          [48.8566, 2.3522],   // Paris
          [55.7558, 37.6173],  // Moscow
          [19.4326, -99.1332], // Mexico City
          [-22.9068, -43.1729], // Rio de Janeiro
          [37.5665, 126.9780], // Seoul
          [28.6139, 77.2090],  // New Delhi
          [39.9042, 116.4074], // Beijing
          [-34.6037, -58.3816]  // Buenos Aires
        ];
        
        // Create dynamic arc array using visitor markers if available
        const arcs = [];
        
        // First, use actual visitor locations if we have them
        const visitorLocations = visitorMarkers.map(marker => marker.location);
        
        // Determine how many arcs to show based on settings
        const maxArcs = Math.min(settings.arcDensity, 10);
        
        // Prioritize real visitor locations, then fill in with popular cities
        for (let i = 0; i < maxArcs; i++) {
          let endLocation: [number, number];
          
          // Use visitor locations if we have them, otherwise fallback to popular cities
          if (i < visitorLocations.length) {
            endLocation = visitorLocations[i];
          } else {
            // Use a popular city with a random index
            const cityIndex = Math.floor(Math.random() * popularCities.length);
            endLocation = popularCities[cityIndex];
          }
          
          // Calculate a unique altitude for each arc to create a more natural look
          // Use the settings.arcAltitude as the base, then vary slightly for each arc
          const altitude = settings.arcAltitude * (0.8 + (Math.random() * 0.4));
          
          // Add animation phase offset (0-1) to stagger the animations
          const phaseOffset = i / maxArcs;
          
          arcs.push({
            start: settings.headquartersLocation,
            end: endLocation,
            color: settings.arcColor,
            altitude, // Add altitude property for enhanced arcs
            animationPhase: phaseOffset // Add custom property for animation control
          });
        }
        
        return arcs;
      };
      
      // Generate arcs to visualize connections between visitor locations
      const arcs = settings.showArcs ? generateArcs() : [];

      // Complete COBE setup with proper rotation
      const options = {
        devicePixelRatio: window.devicePixelRatio || 2,
        width: 1000,  // Increased canvas size for better resolution
        height: 1000, // Increased canvas size for better resolution
        phi: currentPhi,
        theta: currentTheta,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: settings.landColor,
        markerColor: [0.1, 0.8, 1] as [number, number, number],
        glowColor: settings.haloColor,
        markers: visitorMarkers,
        arcs: arcs,
        scale: settings.globeSize,
        pointSize: settings.dotSize,
        opacity: 0.7, // Slight transparency for better visibility of arcs
        onRender: (state: any) => {
          // Increment frame counter for debugging
          frameCountRef.current += 1;
          
          // Log every 100 frames to avoid console spam
          if (frameCountRef.current % 100 === 0) {
            console.log(`Globe render frame #${frameCountRef.current}`);
          }
          
          // Auto rotation when not interacting
          if (settings.autoRotate && pointerInteracting.current === null) {
            // Apply very slow rotation speed based on settings for a subtle effect
            const rotationFactor = settings.rotationSpeed / 500;
            phiRef.current += rotationFactor;
          }
          
          // Update both phi and theta for proper rotation
          state.phi = phiRef.current;
          state.theta = thetaRef.current;
          
          // Handle arc animations when enabled
          if (settings.showArcs && Array.isArray(state.arcs)) {
            // Calculate time factor for animations
            const now = Date.now();
            const deltaTime = now - arcAnimTimeRef.current;
            arcAnimTimeRef.current = now;
            
            // Apply animation speed based on settings
            const animationSpeedFactor = (deltaTime / 1000) * settings.arcAnimationSpeed;
            
            // Update the progress of each arc
            state.arcs.forEach((arc: any, index: number) => {
              if (arc && typeof arc.animationPhase !== 'undefined') {
                // Update arc phase based on time and stagger
                arc.animationPhase = (arc.animationPhase + animationSpeedFactor) % 1;
                
                // Calculate progress-based alpha (transparency) for the arc
                // This creates a pulse effect as it travels from start to end
                if (arc.animationPhase <= 0.5) {
                  // Fade in during the first half
                  arc.alpha = Math.min(1, arc.animationPhase * 2);
                } else {
                  // Fade out during the second half
                  arc.alpha = Math.max(0, 1 - ((arc.animationPhase - 0.5) * 2));
                }
              }
            });
          }
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
  
  // Handle pointer interaction with both horizontal and vertical rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX;
    pointerInteractionMovement.current = e.clientY;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const deltaX = e.clientX - pointerInteracting.current;
      const deltaY = e.clientY - pointerInteractionMovement.current;
      
      pointerInteracting.current = e.clientX;
      pointerInteractionMovement.current = e.clientY;
      
      // Make sensitivity adjustable using the settings
      const sensitivityFactor = settings.mouseSensitivity / 40;
      
      // Update phi based on horizontal movement (left/right rotation)
      phiRef.current += deltaX * sensitivityFactor / 100;
      
      // Update theta based on vertical movement (up/down rotation)
      // Limit theta to avoid flipping the globe
      thetaRef.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, 
        thetaRef.current + deltaY * sensitivityFactor / 100));
    }
  };
  
  const handlePointerUp = () => {
    pointerInteracting.current = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };
  
  // Handle touch events with both horizontal and vertical rotation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    pointerInteracting.current = touch.clientX;
    pointerInteractionMovement.current = touch.clientY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (pointerInteracting.current === null || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - pointerInteracting.current;
    const deltaY = touch.clientY - pointerInteractionMovement.current;
    
    pointerInteracting.current = touch.clientX;
    pointerInteractionMovement.current = touch.clientY;
    
    // Make sensitivity adjustable using the settings
    const sensitivityFactor = settings.mouseSensitivity / 40;
    
    // Update phi based on horizontal movement (left/right rotation)
    phiRef.current += deltaX * sensitivityFactor / 100;
    
    // Update theta based on vertical movement (up/down rotation)
    // Limit theta to avoid flipping the globe
    thetaRef.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, 
      thetaRef.current + deltaY * sensitivityFactor / 100));
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
        background: "linear-gradient(135deg, #061033 0%, #030b30 100%)",
        zIndex: -1,
        overflow: "hidden"
      }}
      className="globe-background"
    >
      {/* Glow effect behind the globe */}
      <div
        style={{
          position: "absolute",
          top: `calc(50% + ${settings.offsetY}%)`,
          left: `calc(50% + ${settings.offsetX}%)`,
          transform: "translate(-50%, -50%)",
          width: `${Math.min(180, 150 * settings.globeSize)}vh`, 
          height: `${Math.min(180, 150 * settings.globeSize)}vh`, 
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(40,120,220,0.15) 0%, rgba(20,80,200,0.08) 40%, rgba(0,0,0,0) 70%)",
          boxShadow: "0 0 80px 10px rgba(30,70,180,0.1)",
          zIndex: 0,
          pointerEvents: "none"
        }}
      />
      
      {/* Main globe canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={1000}
        style={{
          position: "absolute",
          top: `calc(50% + ${settings.offsetY}%)`,
          left: `calc(50% + ${settings.offsetX}%)`,
          transform: "translate(-50%, -50%)",
          width: `${Math.min(190, 160 * settings.globeSize)}vh`, 
          height: `${Math.min(130, 110 * settings.globeSize)}vh`,
          cursor: "grab",
          touchAction: "none",
          zIndex: 1,
          opacity: settings.opacity
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