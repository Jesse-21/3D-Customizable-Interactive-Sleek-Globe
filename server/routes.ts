import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";

// For tracking connected clients and visitor locations
interface VisitorLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// Free IP geolocation API
const IP_API_URL = "http://ip-api.com/json/";

interface GeoLocationResponse {
  status: string;
  lat?: number;
  lon?: number;
  message?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // In-memory storage of recent visitor locations (for new connections)
  const recentVisitorLocations: VisitorLocation[] = [];
  const MAX_STORED_LOCATIONS = 30; // Keep only the most recent locations
  
  // Simple status endpoint to check if the server is running
  app.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Server is running correctly',
      timestamp: new Date().toISOString()
    });
  });
  
  // API route to get globe settings (default values)
  app.get('/api/globe-settings', (req, res) => {
    res.json({
      rotationSpeed: 3,
      mouseSensitivity: 40,
      dotSize: 0.5,
      globeSize: 1.1,
      autoRotate: true
    });
  });

  // IP Geolocation endpoint
  app.get("/api/geolocation", async (req: Request, res: Response) => {
    try {
      // Get client IP (Note: In production with a proxy, you might need to check X-Forwarded-For header)
      const ip = req.ip || req.socket.remoteAddress || ""; 
      
      // Remove IPv6 localhost prefix if present
      const cleanIp = ip.replace(/^::ffff:/, '');
      
      // Don't query the API for localhost/private IPs in development
      if (cleanIp === "127.0.0.1" || cleanIp === "localhost" || cleanIp.startsWith("192.168.") || cleanIp.startsWith("10.")) {
        // Return random coordinates for testing in development
        return res.json({
          status: "success",
          lat: (Math.random() * 180) - 90, // Random latitude between -90 and 90
          lon: (Math.random() * 360) - 180 // Random longitude between -180 and 180
        });
      }
      
      // Make request to IP geolocation API
      const response = await fetch(`${IP_API_URL}${cleanIp}`);
      const data = await response.json() as any;
      
      if (data.status === "success") {
        res.json({
          status: "success",
          lat: data.lat,
          lon: data.lon
        });
      } else {
        // API returned an error
        res.json({
          status: "error",
          message: data.message || "Unknown error from geolocation service"
        });
      }
    } catch (error) {
      console.error(`Error in geolocation API:`, error);
      res.status(500).json({
        status: "error",
        message: "Failed to get geolocation data"
      });
    }
  });

  const httpServer = createServer(app);
  
  // Create WebSocket server with explicit path that doesn't conflict with Vite
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    
    // Send all recent visitor locations to the newly connected client
    if (recentVisitorLocations.length > 0) {
      ws.send(JSON.stringify({
        type: 'initial_locations',
        locations: recentVisitorLocations
      }));
    }
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'new_visitor' && data.latitude !== undefined && data.longitude !== undefined) {
          const visitorLocation: VisitorLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: Date.now()
          };
          
          // Add to recent locations
          recentVisitorLocations.push(visitorLocation);
          
          // Keep only the most recent locations
          if (recentVisitorLocations.length > MAX_STORED_LOCATIONS) {
            recentVisitorLocations.shift(); // Remove oldest
          }
          
          // Broadcast to all connected clients
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify({
                type: 'visitor_location',
                location: visitorLocation
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
