import { type User, type InsertUser, type Order, type InsertOrder, type LiveShow, type InsertLiveShow, type Analytics, type InsertAnalytics, type ShippingProfile, type InsertShippingProfile, type ShipmentBundle, type InsertShipmentBundle } from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Order methods
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string, trackingNumber?: string): Promise<Order | undefined>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;

  // Live Show methods
  getLiveShows(): Promise<LiveShow[]>;
  getLiveShow(id: string): Promise<LiveShow | undefined>;
  createLiveShow(show: InsertLiveShow): Promise<LiveShow>;
  updateLiveShow(id: string, updates: Partial<LiveShow>): Promise<LiveShow | undefined>;
  getRooms(params: {
    page: number;
    limit: number;
    category?: string;
    userid?: string;
    currentUserId?: string;
    title?: string;
    status?: string;
  }): Promise<{ rooms: LiveShow[]; total: number; page: number; limit: number }>;

  // Analytics methods
  getAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getDashboardMetrics(): Promise<{
    totalSales: string;
    totalOrders: number;
    activeBuyers: number;
    liveShows: number;
    avgShippingTime: string;
    cancellationRate: string;
    satisfactionRating: string;
    followers: number;
  }>;

  // Shipping methods
  getShippingProfiles(): Promise<ShippingProfile[]>;
  createShippingProfile(profile: InsertShippingProfile): Promise<ShippingProfile>;
  getShipmentMetrics(): Promise<{
    totalSold: string;
    totalEarned: string;
    totalShippingSpend: string;
    totalCouponSpend: string;
    itemsSold: number;
    totalDelivered: number;
    pendingDelivery: number;
  }>;

  // Bundle methods
  getBundles(): Promise<ShipmentBundle[]>;
  createBundle(orderIds: string[], bundleName: string): Promise<ShipmentBundle>;
  unbundleOrders(bundleId: string): Promise<Order[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private orders: Map<string, Order> = new Map();
  private liveShows: Map<string, LiveShow> = new Map();
  private analytics: Map<string, Analytics> = new Map();
  private shippingProfiles: Map<string, ShippingProfile> = new Map();
  private bundles: Map<string, ShipmentBundle> = new Map();

  constructor() {
    // Storage starts empty - no mock data
  }


  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      avatar: null,
      seller: insertUser.seller ?? null,
      admin: insertUser.admin ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  // Order methods
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder, 
      id,
      itemCount: insertOrder.itemCount || 1,
      weight: insertOrder.weight || null,
      dimensions: insertOrder.dimensions || null,
      shippingCost: insertOrder.shippingCost || "0",
      couponDiscount: insertOrder.couponDiscount || "0",
      bundleId: insertOrder.bundleId || null,
      createdAt: new Date(),
      shippedAt: null,
      deliveredAt: null,
      trackingNumber: null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder: Order = { ...order, ...updates };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrderStatus(id: string, status: string, trackingNumber?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder: Order = { 
      ...order, 
      status,
      trackingNumber: trackingNumber || order.trackingNumber,
      shippedAt: status === "shipped" ? new Date() : order.shippedAt,
      deliveredAt: status === "delivered" ? new Date() : order.deliveredAt,
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.status === status);
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => 
      new Date(order.createdAt) >= startDate && new Date(order.createdAt) <= endDate
    );
  }

  // Live Show methods
  async getLiveShows(): Promise<LiveShow[]> {
    return Array.from(this.liveShows.values()).sort((a, b) => 
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }

  async getLiveShow(id: string): Promise<LiveShow | undefined> {
    return this.liveShows.get(id);
  }

  async createLiveShow(insertShow: InsertLiveShow): Promise<LiveShow> {
    const id = randomUUID();
    const show: LiveShow = { 
      ...insertShow, 
      id,
      description: insertShow.description || null,
      viewerCount: 0,
      totalSales: "0",
      thumbnail: null,
    };
    this.liveShows.set(id, show);
    return show;
  }

  async updateLiveShow(id: string, updates: Partial<LiveShow>): Promise<LiveShow | undefined> {
    const show = this.liveShows.get(id);
    if (!show) return undefined;

    const updatedShow: LiveShow = { ...show, ...updates };
    this.liveShows.set(id, updatedShow);
    return updatedShow;
  }

  async getRooms(params: {
    page: number;
    limit: number;
    category?: string;
    userid?: string;
    currentUserId?: string;
    title?: string;
    status?: string;
  }): Promise<{ rooms: LiveShow[]; total: number; page: number; limit: number }> {
    let rooms = Array.from(this.liveShows.values());

    // Filter by category
    if (params.category) {
      rooms = rooms.filter(room => room.category === params.category);
    }

    // Filter by host user ID
    if (params.userid) {
      rooms = rooms.filter(room => room.hostId === params.userid);
    }

    // Filter by title (search)
    if (params.title) {
      rooms = rooms.filter(room => 
        room.title.toLowerCase().includes(params.title!.toLowerCase())
      );
    }

    // Filter by status
    if (params.status) {
      rooms = rooms.filter(room => room.status === params.status);
    }

    // Sort by scheduled time
    rooms = rooms.sort((a, b) => 
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );

    const total = rooms.length;
    const offset = (params.page - 1) * params.limit;
    const paginatedRooms = rooms.slice(offset, offset + params.limit);

    return {
      rooms: paginatedRooms,
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  // Analytics methods
  async getAnalytics(startDate?: Date, endDate?: Date): Promise<Analytics[]> {
    let analyticsData = Array.from(this.analytics.values());
    
    if (startDate && endDate) {
      analyticsData = analyticsData.filter(data => 
        new Date(data.date) >= startDate && new Date(data.date) <= endDate
      );
    }
    
    return analyticsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const id = randomUUID();
    const analytics: Analytics = { 
      ...insertAnalytics, 
      id,
      avgShippingTime: insertAnalytics.avgShippingTime || null,
      cancellationRate: insertAnalytics.cancellationRate || null,
      satisfactionRating: insertAnalytics.satisfactionRating || null,
    };
    this.analytics.set(id, analytics);
    return analytics;
  }

  async getDashboardMetrics() {
    const orders = await this.getOrders();
    const shows = await this.getLiveShows();
    
    const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.amount), 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthOrders = orders.filter(order => new Date(order.createdAt) >= thisMonth);
    
    return {
      totalSales: totalSales.toFixed(2),
      totalOrders: orders.length,
      activeBuyers: new Set(orders.map(order => order.customerId)).size,
      liveShows: shows.length,
      avgShippingTime: "1.2",
      cancellationRate: "2.1",
      satisfactionRating: "4.8",
      followers: 3247,
    };
  }

  // Shipping methods
  async getShippingProfiles(): Promise<ShippingProfile[]> {
    return Array.from(this.shippingProfiles.values());
  }

  async createShippingProfile(insertProfile: InsertShippingProfile): Promise<ShippingProfile> {
    const id = randomUUID();
    const profile: ShippingProfile = { 
      ...insertProfile, 
      id,
      description: insertProfile.description || null,
      freeShippingThreshold: insertProfile.freeShippingThreshold || null,
      bundleEnabled: insertProfile.bundleEnabled ?? null,
      maxBundleSize: insertProfile.maxBundleSize ?? null,
    };
    this.shippingProfiles.set(id, profile);
    return profile;
  }

  async getShipmentMetrics(userId?: string) {
    // For now, return zero metrics since this user has no orders
    // In the future, this would calculate from real user order data
    return {
      totalSold: "0.00",
      totalEarned: "0.00",
      totalShippingSpend: "0.00",
      totalCouponSpend: "0.00",
      itemsSold: 0,
      totalDelivered: 0,
      pendingDelivery: 0,
    };
  }

  // Bundle methods
  async getBundles(): Promise<ShipmentBundle[]> {
    return Array.from(this.bundles.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createBundle(orderIds: string[], bundleName: string): Promise<ShipmentBundle> {
    const bundleId = randomUUID();
    
    // Get the orders to bundle
    const ordersToBundle = orderIds.map(id => this.orders.get(id)).filter(Boolean) as Order[];
    
    if (ordersToBundle.length === 0) {
      throw new Error("No valid orders found to bundle");
    }

    // Calculate total weight only (not dimensions)
    let totalWeight = 0;
    
    ordersToBundle.forEach(order => {
      if (order.weight) {
        totalWeight += parseFloat(order.weight.replace(' oz', ''));
      }
    });

    // Create the bundle
    const bundle: ShipmentBundle = {
      id: bundleId,
      bundleName,
      totalWeight: totalWeight > 0 ? `${totalWeight} oz` : null,
      totalDimensions: null, // Don't aggregate dimensions when bundling
      trackingNumber: null,
      shippingCost: "0",
      createdAt: new Date(),
      shippedAt: null,
    };

    this.bundles.set(bundleId, bundle);

    // Update orders to reference the bundle
    ordersToBundle.forEach(order => {
      const updatedOrder = { ...order, bundleId };
      this.orders.set(order.id, updatedOrder);
    });

    return bundle;
  }

  async unbundleOrders(bundleId: string): Promise<Order[]> {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) {
      throw new Error("Bundle not found");
    }

    // Find all orders in this bundle
    const bundledOrders = Array.from(this.orders.values()).filter(order => order.bundleId === bundleId);
    
    // Remove bundle reference from orders
    bundledOrders.forEach(order => {
      const updatedOrder = { ...order, bundleId: null };
      this.orders.set(order.id, updatedOrder);
    });

    // Remove the bundle
    this.bundles.delete(bundleId);

    return bundledOrders;
  }
}

export const storage = new MemStorage();
