import { useEffect, useRef, useState } from "react";
import { GlobeSettings, RGBColor, LocationCoordinates } from "@/hooks/useGlobeSettings";
import createGlobe from "cobe";

// Helper function to convert lat/long to 3D point for arc visualization
function coordinatesToPoint(lat: number, lng: number, state: any, scale: number) {
  // First validate the coordinates to ensure they're within valid range
  // Latitude must be between -90 and 90
  const validLat = Math.max(-90, Math.min(90, lat));
  
  // Longitude must be between -180 and 180
  const validLng = ((lng + 540) % 360) - 180;
  
  // Convert to radians
  const phi = (90 - validLat) * (Math.PI / 180);
  const theta = (validLng + 180) * (Math.PI / 180);
  
  // Calculate 3D position on the unit sphere, accounting for globe rotation
  const rotatedTheta = theta + state.phi;
  const nx = -Math.sin(phi) * Math.cos(rotatedTheta);
  const ny = Math.cos(phi);
  const nz = Math.sin(phi) * Math.sin(rotatedTheta);
  
  // Get the normalized vector to use for precise surface point calculation
  const norm = Math.sqrt(nx*nx + ny*ny + nz*nz);
  const normalizedX = nx / norm;
  const normalizedY = ny / norm;
  const normalizedZ = nz / norm;
  
  // Check if point is visible (in front of the globe)
  // Use a slightly more forgiving check to ensure connected arcs don't suddenly disappear
  if (normalizedZ < -0.2) return null;
  
  // Calculate the center of the screen
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  // Account for any offsetX and offsetY settings for globe positioning
  const offsetX = window.innerWidth * (state.offsetX || 0) / 100;
  const offsetY = window.innerHeight * (state.offsetY || 0) / 100;
  
  // Adjust projection factor based on globe scale and distance from center
  // This ensures points stay precisely on the surface as the globe size changes
  const baseFactor = 110;
  const perspectiveFactor = Math.max(1, scale);
  
  // Apply perspective correction - points further from center need more projection
  // The 0.25 factor reduces the effect to avoid extreme distortion
  const distanceCorrection = 1 + (0.25 * (1 - normalizedZ));
  const projectionFactor = baseFactor * perspectiveFactor * distanceCorrection;
  
  // Calculate final screen position
  const screenX = centerX + offsetX + (normalizedX * scale * projectionFactor);
  const screenY = centerY + offsetY + (normalizedY * scale * projectionFactor);
  
  return {
    x: screenX,
    y: screenY,
    z: normalizedZ // Return z for depth ordering if needed
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
  
  // Helper function to create a new connection arc
  const createNewConnectionArc = (): ConnectionArc => {
    // Create arcs from headquarters to random points 75% of the time
    // and between random points 25% of the time
    const useHeadquarters = Math.random() < 0.75;
    
    let startLat, startLng, endLat, endLng;
    
    if (useHeadquarters) {
      // Start from headquarters with validated coordinates
      [startLat, startLng] = validateCoordinates(
        settings.headquartersLocation[0], 
        settings.headquartersLocation[1]
      );
      
      // End at a random location with validated coordinates
      const randomLocation = generateRandomVisitorLocation();
      [endLat, endLng] = validateCoordinates(randomLocation[0], randomLocation[1]);
    } else {
      // Both start and end are random locations with validated coordinates
      const randomLocation1 = generateRandomVisitorLocation();
      const randomLocation2 = generateRandomVisitorLocation();
      
      [startLat, startLng] = validateCoordinates(randomLocation1[0], randomLocation1[1]);
      [endLat, endLng] = validateCoordinates(randomLocation2[0], randomLocation2[1]);
    }
    
    // Create a slightly randomized color based on the base arc color
    // This will create visual variation in the arcs for a more dynamic look
    const baseColor = [...settings.arcColor];
    
    // Brighten the color for better visibility
    const colorVariation = 0.3; // 30% variation
    const color: RGBColor = [
      Math.min(1, baseColor[0] + (Math.random() * colorVariation)),
      Math.min(1, baseColor[1] + (Math.random() * colorVariation)),
      Math.min(1, baseColor[2] + (Math.random() * colorVariation))
    ];
    
    return {
      startLat,
      startLng,
      endLat,
      endLng,
      color, // Use randomized color variation
      progress: 0 // Start at beginning of animation
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
      console.log("Glitch effect enabled, setting up glitch timer");
      // Glitch effect timer - more advanced visual glitches
      glitchTimerRef.current = window.setInterval(() => {
        if (!canvasRef.current || !globeInstanceRef.current) return;
        
        // Calculate time since last glitch to avoid too frequent glitches
        const now = Date.now();
        
        // Random chance of different types of glitches
        const glitchRandom = Math.random();
        
        // Don't glitch too frequently
        if (now - lastGlitchTimeRef.current < 2000) return;
        
        // Increased chance of glitch - 20% instead of 10%
        if (glitchRandom > 0.2) return;
        
        console.log("Glitch effect triggered");
        
        lastGlitchTimeRef.current = now;
        
        // Determine glitch type based on random value
        const glitchType = Math.floor(Math.random() * 3); // 0, 1, or 2
        
        // Duration varies by glitch type
        let glitchDuration;
        
        if (glitchType === 0) {
          // Short color flash (80-150ms)
          glitchDuration = 80 + Math.random() * 70;
        } else if (glitchType === 1) {
          // Medium disruption (150-300ms)
          glitchDuration = 150 + Math.random() * 150;
        } else {
          // Major glitch (300-500ms)
          glitchDuration = 300 + Math.random() * 200;
        }
        
        // Apply the glitch by reinitializing the globe with distorted settings
        try {
          // Store canvas position before glitch
          const canvasStyle = canvasRef.current.style.cssText;
          const arcsCanvas = document.getElementById('arcs-canvas') as HTMLCanvasElement;
          const arcsStyle = arcsCanvas ? arcsCanvas.style.cssText : '';
          
          // Store the current cleanup function
          const cleanup = globeInstanceRef.current;
          
          // Create a new instance to cause a visual "glitch"
          if (typeof cleanup === 'function') {
            cleanup();
            
            // Add visual disruption effects based on glitch type
            if (glitchType >= 1) {
              // For medium and major glitches, add position offset
              const glitchOffset = glitchType === 1 ? 5 : 10;
              const xOffset = (Math.random() * glitchOffset * 2) - glitchOffset;
              const yOffset = (Math.random() * glitchOffset * 2) - glitchOffset;
              
              if (canvasRef.current) {
                canvasRef.current.style.transform = `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px))`;
              }
              
              if (arcsCanvas) {
                arcsCanvas.style.transform = `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px))`;
              }
            }
            
            // For major glitches, temporarily add visual artifacts
            if (glitchType === 2) {
              // Add scan lines effect to the canvas container
              const container = canvasRef.current.parentElement;
              if (container) {
                const scanLinesElement = document.createElement('div');
                scanLinesElement.id = 'glitch-scanlines';
                scanLinesElement.style.cssText = `
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: repeating-linear-gradient(
                    to bottom,
                    rgba(0, 0, 0, 0),
                    rgba(0, 0, 0, 0) 1px,
                    rgba(150, 210, 255, 0.15) 1px,
                    rgba(150, 210, 255, 0.15) 2px
                  );
                  z-index: 10;
                  pointer-events: none;
                  animation: scanlines 0.1s linear infinite;
                `;
                container.appendChild(scanLinesElement);
                
                // Remove the scan lines after the glitch
                setTimeout(() => {
                  const element = document.getElementById('glitch-scanlines');
                  if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                  }
                }, glitchDuration);
              }
            }
            
            // Force a small delay before recreating
            setTimeout(() => {
              if (canvasRef.current) {
                initGlobe(true); // Pass true to use glitch colors
                
                // Restore normal appearance after the glitch duration
                setTimeout(() => {
                  if (canvasRef.current) {
                    // Restore original styles
                    canvasRef.current.style.cssText = canvasStyle;
                    if (arcsCanvas) {
                      arcsCanvas.style.cssText = arcsStyle;
                    }
                    
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
      }, 4000); // Check for glitch opportunity every 4 seconds
    }
    
    return () => {
      if (glitchTimerRef.current !== null) {
        clearInterval(glitchTimerRef.current);
        glitchTimerRef.current = null;
      }
      
      // Clean up any remaining effects
      const scanlines = document.getElementById('glitch-scanlines');
      if (scanlines && scanlines.parentNode) {
        scanlines.parentNode.removeChild(scanlines);
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
    
    // Initialize with more arcs and setup the arc canvas
    if (connectionArcs.length === 0) {
      const initialArcs = Array.from({ length: 6 }, () => createNewConnectionArc());
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
        // Calculate progress step based on where we are in the animation
        // Slower at the end for a longer fade-out effect
        let progressStep;
        
        if (arc.progress < 0.7) {
          // Normal speed for most of the journey
          progressStep = 0.004;
        } else if (arc.progress < 0.85) {
          // Slow down as we approach the end
          progressStep = 0.002;
        } else {
          // Very slow at the end for a longer fade-out
          progressStep = 0.001;
        }
        
        const newProgress = arc.progress + progressStep;
        
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
      
      // Add a new arc occasionally, but only up to a maximum of 8
      // Lower probability (0.005 vs 0.01) means arcs appear less frequently
      if (Math.random() < 0.005 && connectionArcs.length < 8) {
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
        // Create a much more dramatic distorted version of the land color
        baseColor = [
          Math.min(1, Math.abs(settings.landColor[0] + (Math.random() * 1.0 - 0.5))),
          Math.min(1, Math.abs(settings.landColor[1] + (Math.random() * 1.0 - 0.5))),
          Math.min(1, Math.abs(settings.landColor[2] + (Math.random() * 1.0 - 0.5))),
        ];
        
        // Create a dramatic distorted version of the glow color - sometimes invert it
        if (Math.random() > 0.5) {
          glowColor = [
            Math.min(1, Math.abs(1 - settings.haloColor[0])),
            Math.min(1, Math.abs(1 - settings.haloColor[1])),
            Math.min(1, Math.abs(1 - settings.haloColor[2])),
          ];
        } else {
          glowColor = [
            Math.min(1, Math.abs(settings.haloColor[0] + (Math.random() * 1.0 - 0.5))),
            Math.min(1, Math.abs(settings.haloColor[1] + (Math.random() * 1.0 - 0.5))),
            Math.min(1, Math.abs(settings.haloColor[2] + (Math.random() * 1.0 - 0.5))),
          ];
        }
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
          
          // Update state with the current offset values
          state.offsetX = settings.offsetX || 0;
          state.offsetY = settings.offsetY || 0;
          
          // Render data connection arcs if enabled
          if (settings.showArcs && connectionArcs.length > 0) {
            const ctx = ctx2dRef.current;
            if (!ctx) return;
            
            // Clear previous arcs
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Sort arcs by z-index so closer arcs are drawn on top
            // Create an array with both arc data and their endpoints to sort
            const arcsWithPoints = connectionArcs.map(arc => {
              const fromPoint = coordinatesToPoint(arc.startLat, arc.startLng, state, options.scale);
              const toPoint = coordinatesToPoint(arc.endLat, arc.endLng, state, options.scale);
              return { arc, fromPoint, toPoint };
            })
            .filter(item => item.fromPoint && item.toPoint) // Only keep visible arcs
            // Sort by average z value - higher values (closer to viewer) drawn last
            .sort((a, b) => {
              if (!a.fromPoint?.z || !b.fromPoint?.z) return 0;
              const avgZA = ((a.fromPoint?.z || 0) + (a.toPoint?.z || 0)) / 2;
              const avgZB = ((b.fromPoint?.z || 0) + (b.toPoint?.z || 0)) / 2;
              return avgZA - avgZB; // Draw back-to-front (painters algorithm)
            });
            
            // Draw each connection arc in sorted order
            arcsWithPoints.forEach(({ arc, fromPoint, toPoint }) => {
              // These points are guaranteed to exist due to the filter above
              if (!fromPoint || !toPoint) return;
              
              const progress = arc.progress;
              const startX = fromPoint.x;
              const startY = fromPoint.y;
              const endX = toPoint.x;
              const endY = toPoint.y;
              
              // Calculate mid-point between start and end positions for control
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              
              // Calculate distance between points to make arc height proportional
              const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
              
              // Dynamically scale arc height based on distance and globe size
              // This ensures the arc scales proportionally when globe size changes
              const arcHeight = Math.min(Math.max(distance * 0.35, 50 * settings.globeSize), 
                                        250 * settings.globeSize);
              
              // Calculate control point for the arc curve
              // We use the mid-point and adjust height based on the z-position
              // This makes arcs curve toward viewer when in front, away when behind
              const zAvg = ((fromPoint.z || 0) + (toPoint.z || 0)) / 2;
              const heightAdjust = 1 + (zAvg * 0.3); // Higher z = more curve
              
              // Calculate the control point for the quadratic curve
              // Adjust vertical position to create proper arc
              const controlX = midX;
              const controlY = midY - (arcHeight * heightAdjust);
              
              // Calculate current point along the curve based on progress
              const currentX = quadraticBezier(progress, startX, controlX, endX);
              const currentY = quadraticBezier(progress, startY, controlY, endY);
              
              // Only draw up to current progress point
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              
              // Improved arc path drawing - always ensure arc stays on globe surface
              // Use bezier curve instead of quadratic for better control of path
              const cp1x = startX + (controlX - startX) * 0.5;
              const cp1y = startY + (controlY - startY) * 0.8;
              const cp2x = controlX + (endX - controlX) * 0.5;
              const cp2y = controlY + (endY - controlY) * 0.8;
              
              // Calculate current point using cubic bezier
              const t = progress;
              const tSq = t * t;
              const tCube = tSq * t;
              const mt = 1 - t;
              const mtSq = mt * mt;
              const mtCube = mtSq * mt;
              
              const currX = mtCube * startX + 3 * mtSq * t * cp1x + 3 * mt * tSq * cp2x + tCube * endX;
              const currY = mtCube * startY + 3 * mtSq * t * cp1y + 3 * mt * tSq * cp2y + tCube * endY;
              
              // Draw the curve using bezier
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currX, currY);
              
              // Get base color for the arc
              const [r, g, b] = arc.color;
              
              // Bullet tracer effect - bright constant color
              const brightR = Math.min(255, Math.round(r * 255 * 1.5));
              const brightG = Math.min(255, Math.round(g * 255 * 1.5));
              const brightB = Math.min(255, Math.round(b * 255 * 1.5));
              
              // Adjust opacity based on progress and z-position
              // Arcs further from viewer (lower z) should be more transparent
              const zFactor = Math.max(0.5, Math.min(1, 0.5 + fromPoint.z)); 
              const trailOpacity = Math.max(0.1, (1 - progress) * zFactor);
              
              // Add subtle glow for visibility - stronger for foreground arcs
              ctx.shadowColor = `rgba(${brightR}, ${brightG}, ${brightB}, ${0.5 * zFactor})`;
              ctx.shadowBlur = 4 * settings.globeSize * zFactor;
              
              // Draw the arc with fading trail effect
              const gradient = ctx.createLinearGradient(startX, startY, currentX, currentY);
              gradient.addColorStop(0, `rgba(${brightR}, ${brightG}, ${brightB}, ${trailOpacity * 0.3})`); // Start faded
              gradient.addColorStop(0.7, `rgba(${brightR}, ${brightG}, ${brightB}, ${trailOpacity * 0.7})`); // Middle brighter
              gradient.addColorStop(1, `rgba(${brightR}, ${brightG}, ${brightB}, ${0.9 * zFactor})`); // End brightest
              
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 2 * settings.globeSize * zFactor; // Line width scaled with globe size
              ctx.stroke();
              
              // Remove shadow for bullet dot
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              
              // Draw "bullet" dot at the current position 
              const dotSize = 3 * settings.globeSize * zFactor;
              ctx.beginPath();
              ctx.arc(currentX, currentY, dotSize, 0, Math.PI * 2);
              ctx.fillStyle = `rgb(${brightR}, ${brightG}, ${brightB})`;
              ctx.fill();
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
        
        // Also resize the arcs canvas
        const arcCanvas = document.getElementById('arcs-canvas') as HTMLCanvasElement;
        if (arcCanvas) {
          arcCanvas.width = window.innerWidth;
          arcCanvas.height = window.innerHeight;
          ctx2dRef.current = arcCanvas.getContext('2d');
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
    // If cursor is over the globe canvas
    if (e.target === canvasRef.current) {
      // If this is a pointerdown event, start the interaction
      if (e.type === 'pointerdown') {
        pointerInteracting.current = e.clientX;
        pointerInteractionMovement.current = e.clientX;
        
        // Set cursor to indicate grabbing
        if (canvasRef.current) {
          canvasRef.current.style.setProperty('cursor', 'grabbing');
        }
        
        // Prevent default to ensure we capture all events
        e.preventDefault();
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
      else if (e.type === 'pointermove') {
        if (pointerInteracting.current !== null) {
          const movementX = e.clientX - pointerInteractionMovement.current;
          // Adjust movement by sensitivity which can be controlled from settings
          const adjustedMovement = movementX * (settings.mouseSensitivity / 40);
          pointerInteractionMovement.current = e.clientX;
          
          // Update current rotation directly through the ref
          phiRef.current += adjustedMovement / 100;
        }
      }
    }
  };
  
  // Handle touch events for mobile devices
  const handleContainerTouchEvents = (e: React.TouchEvent) => {
    // Check if we're touching the canvas
    if (e.target === canvasRef.current) {
      // Touch start
      if (e.type === 'touchstart' && e.touches.length === 1) {
        e.preventDefault();
        pointerInteracting.current = e.touches[0].clientX;
        pointerInteractionMovement.current = e.touches[0].clientX;
        
        // Set cursor (though not visible on touch devices, this helps maintain state)
        if (canvasRef.current) {
          canvasRef.current.style.setProperty('cursor', 'grabbing');
        }
      } 
      // Touch move
      else if (e.type === 'touchmove' && e.touches.length === 1 && pointerInteracting.current !== null) {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const movementX = touchX - pointerInteractionMovement.current;
        
        // Adjust movement by sensitivity (same as mouse)
        const adjustedMovement = movementX * (settings.mouseSensitivity / 40);
        pointerInteractionMovement.current = touchX;
        
        // Update rotation directly through the ref
        phiRef.current += adjustedMovement / 100;
      } 
      // Touch end
      else if (e.type === 'touchend') {
        pointerInteracting.current = null;
        
        // Reset cursor
        if (canvasRef.current) {
          canvasRef.current.style.setProperty('cursor', 'grab');
        }
      }
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
        background: "linear-gradient(135deg, #060c21 0%, #0a0a2c 100%)",
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
      {/* Logo placeholder - will be replaced with SVG in future */}
      <div 
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 3,
          pointerEvents: "none",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          maxWidth: "500px"
        }}
        id="logo-container"
      />
      
      {/* Enhanced glow effect layer that scales with globe size */}
      <div
        style={{
          position: "absolute",
          top: `calc(50% + ${settings.offsetY}%)`,
          left: `calc(50% + ${settings.offsetX}%)`,
          transform: "translate(-50%, -50%)",
          width: `${90 * settings.globeSize}vh`, 
          height: `${90 * settings.globeSize}vh`, 
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30,100,200,0.2) 0%, rgba(10,60,180,0.08) 50%, rgba(0,0,0,0) 70%)",
          boxShadow: "0 0 150px 20px rgba(30,70,180,0.12)",
          zIndex: 0,
          pointerEvents: "none"
        }}
      />
      
      {/* Main globe canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: `calc(50% + ${settings.offsetY}%)`,
          left: `calc(50% + ${settings.offsetX}%)`,
          transform: "translate(-50%, -50%)",
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
          top: `calc(50% + ${settings.offsetY}%)`,
          left: `calc(50% + ${settings.offsetX}%)`,
          transform: "translate(-50%, -50%)",
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