import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
