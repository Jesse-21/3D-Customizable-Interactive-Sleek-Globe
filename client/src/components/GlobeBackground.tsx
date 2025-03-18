import React, { useEffect, useRef, useState } from "react";
import { GlobeSettings, LocationCoordinates } from "@/hooks/useGlobeSettings";
import createGlobe from "cobe";

// Define marker types for COBE that match exactly what the library expects
interface LocationMarker {
  location: [number, number];
  size: number;
  color: [number, number, number];
  timestamp: number; // Our custom property for tracking when markers were added
}

// WebSocket message type for visitor locations
interface WebSocketMessage {
  type: 'visitor_location' | 'initial_locations';
  location?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
  locations?: Array<{
    latitude: number;
    longitude: number;
    timestamp: number;
  }>;
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

  // WebSocket reference for visitor location updates
  const websocketRef = useRef<WebSocket | null>(null);
  
  // Get visitor's location and set up WebSocket connection
  useEffect(() => {
    const shouldShowMarkers = settings.showVisitorMarkers;
    if (!shouldShowMarkers) return;
    
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
    
    // Function to set up WebSocket connection
    const setupWebSocket = () => {
      // Get the WebSocket URL (use secure WebSocket if the page is loaded over HTTPS)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use the /ws path to match server configuration
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;
      
      // WebSocket event handlers
      ws.onopen = () => {
        console.log('WebSocket connection established');
        
        // Get visitor's location to broadcast to other clients
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Broadcast this visitor's location to all other clients
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'new_visitor',
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                }));
                
                // Add the visitor's own marker locally
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
              }
            },
            (error) => {
              console.log("Geolocation error or permission denied:", error);
              
              // Use an approximate location based on populated regions
              const approximateLocation = generateRandomVisitorLocation();
              
              // Broadcast this approximate location
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'new_visitor',
                  latitude: approximateLocation[0],
                  longitude: approximateLocation[1]
                }));
                
                // Add the marker locally
                const newMarker = createMarker(
                  approximateLocation[0],
                  approximateLocation[1],
                  Date.now()
                );
                
                setVisitorMarkers(prev => [...prev, newMarker]);
              }
            }
          );
        }
      };
      
      // Handle incoming WebSocket messages
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          
          if (data.type === 'visitor_location' && data.location) {
            // Add a new visitor location received from another client
            const marker = createMarker(
              data.location.latitude,
              data.location.longitude,
              data.location.timestamp
            );
            
            // Add this marker and ensure we don't exceed max markers
            setVisitorMarkers(prev => {
              const newMarkers = [...prev, marker];
              // Keep only the most recent 12 markers
              return newMarkers.length > 12 ? newMarkers.slice(-12) : newMarkers;
            });
          } 
          else if (data.type === 'initial_locations' && data.locations && data.locations.length > 0) {
            // Process all initial locations received when first connecting
            const markers = data.locations.map(loc => 
              createMarker(loc.latitude, loc.longitude, loc.timestamp)
            );
            
            // Add these markers to our state
            setVisitorMarkers(prev => {
              const newMarkers = [...prev, ...markers];
              // Keep only the most recent 12 markers
              return newMarkers.length > 12 ? newMarkers.slice(-12) : newMarkers;
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      // Handle WebSocket connection closure
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        websocketRef.current = null;
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          if (shouldShowMarkers) {
            setupWebSocket();
          }
        }, 5000);
      };
      
      // Handle WebSocket errors
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Close the connection on error to trigger reconnection
        ws.close();
      };
      
      return ws;
    };
    
    // Check if we have a stored location
    const storedLocation = localStorage.getItem('visitorLocation');
    if (storedLocation) {
      try {
        const { location, timestamp } = JSON.parse(storedLocation);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - timestamp > thirtyDaysInMs;
        
        if (isExpired) {
          // Reset markers after 30 days
          localStorage.removeItem('visitorLocation');
        } else {
          // Add the visitor's own stored location marker
          const marker = createMarker(location[0], location[1], timestamp);
          setVisitorMarkers([marker]);
        }
      } catch (e) {
        console.error("Error parsing stored location:", e);
        localStorage.removeItem('visitorLocation');
      }
    }
    
    // Set up WebSocket connection
    const ws = setupWebSocket();
    
    // Cleanup function
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, [settings.showVisitorMarkers]);

  // We've replaced the automatic marker generation with real-time WebSocket updates
  
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
      
      // Set up COBE options with default values that ensure the land dots are visible
      // Setup the visible arcs if enabled
      const arcs = settings.showArcs ? [
        // Arc from headquarters to random locations
        {
          start: settings.headquartersLocation,
          end: [40.7128, -74.0060], // New York
          color: settings.arcColor,
        },
        {
          start: settings.headquartersLocation,
          end: [51.5074, -0.1278], // London
          color: settings.arcColor,
        },
        {
          start: settings.headquartersLocation,
          end: [35.6762, 139.6503], // Tokyo
          color: settings.arcColor,
        },
        {
          start: settings.headquartersLocation,
          end: [-33.8688, 151.2093], // Sydney
          color: settings.arcColor,
        }
      ] : [];

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
        scale: settings.globeSize,
        pointSize: settings.dotSize,
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