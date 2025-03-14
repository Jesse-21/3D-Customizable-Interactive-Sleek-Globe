import { useEffect, useRef, useState } from "react";
import { GlobeSettings } from "@/hooks/useGlobeSettings";

// Declare the COBE library type
declare const COBE: any;

interface GlobeBackgroundProps {
  settings: GlobeSettings;
}

const GlobeBackground = ({ settings }: GlobeBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<any>(null);
  const phiRef = useRef<number>(0);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Load COBE script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/cobe@0.6.3/dist/index.js";
    script.async = true;
    
    script.onload = () => {
      if (canvasRef.current && COBE) {
        initGlobe();
      }
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (globeRef.current) {
        globeRef.current = null;
      }
    };
  }, []);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (globeRef.current) {
        // Destroy old globe
        globeRef.current = null;
        
        // Re-init globe with new dimensions
        if (canvasRef.current && window.COBE) {
          initGlobe();
        }
      }
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX - window.innerWidth / 2,
        y: e.clientY - window.innerHeight / 2
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  
  // Re-initialize globe when settings change
  useEffect(() => {
    if (canvasRef.current && window.COBE && !globeRef.current) {
      initGlobe();
    }
  }, [settings]);
  
  // Initialize the COBE globe
  const initGlobe = () => {
    if (!canvasRef.current || !window.COBE) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Set canvas dimensions to match window
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    
    globeRef.current = window.COBE(canvasRef.current, {
      devicePixelRatio: 2,
      width,
      height,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      scale: settings.globeSize,
      mapSamples: 16000,
      mapBrightness: 4,
      baseColor: [0.1, 0.1, 0.2],
      markerColor: [1, 0.5, 1],
      glowColor: [0.2, 0.8, 1],
      markers: [],
      onRender: (state: any) => {
        // Auto rotation
        if (settings.autoRotate) {
          phiRef.current += settings.rotationSpeed / 1000;
          state.phi = phiRef.current;
        }
        
        // Mouse interaction
        const targetX = mousePosition.x * 0.005 * (settings.mouseSensitivity / 50);
        const targetY = mousePosition.y * 0.005 * (settings.mouseSensitivity / 50);
        
        // Apply mouse movement with smooth transition
        state.phi = phiRef.current + targetX;
        state.theta = 0.3 + targetY;
        
        // Update parameters from controls
        state.scale = settings.globeSize;
        state.pointSize = settings.dotSize;
      }
    });
  };
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        background: "#050818" // Space color background
      }}
    />
  );
};

export default GlobeBackground;
