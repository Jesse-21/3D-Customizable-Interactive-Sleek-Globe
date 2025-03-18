import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Visitor location tracking
export const visitorLocations = pgTable("visitor_locations", {
  id: serial("id").primaryKey(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVisitorLocationSchema = createInsertSchema(visitorLocations).pick({
  latitude: true,
  longitude: true,
  ipAddress: true,
  userAgent: true,
});

export type InsertVisitorLocation = z.infer<typeof insertVisitorLocationSchema>;
export type VisitorLocation = typeof visitorLocations.$inferSelect;
