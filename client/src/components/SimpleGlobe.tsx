import { useRef, useEffect } from 'react';
import createGlobe from 'cobe';

interface PointerPosition {
  x: number;
  y: number;
}

const SimpleGlobe = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerInteracting = useRef<PointerPosition | null>(null);
  const phiRef = useRef(0);
  const thetaRef = useRef(0);
  
  // Setup globe with simple mouse interaction
  useEffect(() => {
    let width = 600;
    let height = 600;
    let globe: any;
    
    console.log("Creating basic COBE globe with interaction enabled");
    
    // Simple COBE implementation
    globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width,
      height,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 1],
      glowColor: [1, 1, 1],
      markers: [],
      onRender: (state: any) => {
        // Auto rotate when not dragging
        if (pointerInteracting.current === null) {
          phiRef.current += 0.005;
        }
        
        // Use the reference values which get updated during dragging
        state.phi = phiRef.current;
        state.theta = thetaRef.current;
      }
    });
    
    console.log("COBE globe created successfully with interactions enabled");
    
    return () => {
      globe.destroy();
    };
  }, []);
  
  // Handle pointer interaction (dragging)
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const deltaX = e.clientX - pointerInteracting.current.x;
      const deltaY = e.clientY - pointerInteracting.current.y;
      
      pointerInteracting.current = { x: e.clientX, y: e.clientY };
      
      // Update phi based on horizontal movement (left/right rotation)
      phiRef.current += deltaX / 100;
      
      // Update theta based on vertical movement (up/down rotation)
      // Limit theta to avoid flipping the globe
      thetaRef.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, thetaRef.current + deltaY / 100));
    }
  };
  
  const handlePointerUp = () => {
    pointerInteracting.current = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: 'black', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '80vmin',
          height: '80vmin',
          cursor: 'grab'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
};

export default SimpleGlobe;
