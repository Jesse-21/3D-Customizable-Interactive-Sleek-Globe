import { users, visitorLocations, type User, type InsertUser, type VisitorLocation, type InsertVisitorLocation } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Visitor location methods
  saveVisitorLocation(location: InsertVisitorLocation): Promise<VisitorLocation>;
  getRecentVisitorLocations(limit?: number): Promise<VisitorLocation[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private visitorLocations: VisitorLocation[];
  currentId: number;
  visitorLocationId: number;

  constructor() {
    this.users = new Map();
    this.visitorLocations = [];
    this.currentId = 1;
    this.visitorLocationId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Visitor location methods
  async saveVisitorLocation(location: InsertVisitorLocation): Promise<VisitorLocation> {
    const id = this.visitorLocationId++;
    const timestamp = new Date();
    // Create visitor location object with proper types
    const visitorLocation: VisitorLocation = { 
      id,
      latitude: location.latitude,
      longitude: location.longitude, 
      ipAddress: location.ipAddress ?? null,
      userAgent: location.userAgent ?? null,
      createdAt: timestamp 
    };
    
    this.visitorLocations.push(visitorLocation);
    
    // Keep only the last 100 visitor locations to prevent excessive memory usage
    if (this.visitorLocations.length > 100) {
      this.visitorLocations = this.visitorLocations.slice(-100);
    }
    
    return visitorLocation;
  }
  
  async getRecentVisitorLocations(limit: number = 30): Promise<VisitorLocation[]> {
    // Sort by timestamp (newest first) and return the specified number of locations
    return [...this.visitorLocations]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
