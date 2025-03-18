import { useRef, useEffect } from 'react';
import createGlobe from 'cobe';

const SimpleGlobe = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerInteracting = useRef<number | null>(null);
  const phiRef = useRef(0);
  
  // Setup globe with simple mouse interaction
  useEffect(() => {
    let phi = 0;
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
          phi += 0.005;
        }
        state.phi = phi;
        phiRef.current = phi;
      }
    });
    
    console.log("COBE globe created successfully with interactions enabled");
    
    return () => {
      globe.destroy();
    };
  }, []);
  
  // Handle pointer interaction (dragging)
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteracting.current = e.clientX;
      phiRef.current -= delta / 100;
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
