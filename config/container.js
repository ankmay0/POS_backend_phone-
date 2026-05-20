import Order from '../models/orderModel.js';
import Food from '../models/foodModel.js';
import { redis } from '../config/redis.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { FoodRepository } from '../repositories/FoodRepository.js';
import { OrderService } from '../services/OrderService.js';
import { NotificationService } from '../services/NotificationService.js';
import { PushNotificationStrategy } from '../services/strategies/PushNotificationStrategy.js';
import { SocketNotificationStrategy } from '../services/strategies/SocketNotificationStrategy.js';
import { CacheService } from '../services/CacheService.js';

/**
 * Dependency Injection Container
 * Implements DIP (Dependency Inversion Principle)
 * Centralizes dependency creation and management
 */
class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service factory (singleton)
   */
  register(name, factory) {
    this.services.set(name, { factory, singleton: true });
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient(name, factory) {
    this.services.set(name, { factory, singleton: false });
  }

  /**
   * Resolve a service by name
   */
  resolve(name) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not registered in DI container`);
    }

    // Return singleton instance if exists
    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }

    // Create new instance for transient
    return service.factory(this);
  }

  /**
   * Set Socket.IO instance (done at runtime)
   */
  setSocketIO(io) {
    this.io = io;
    // Re-register notification service with socket strategy
    this.registerNotificationService();
  }

  /**
   * Register notification service with all strategies
   */
  registerNotificationService() {
    this.register('notificationService', (container) => {
      const strategies = [
        new PushNotificationStrategy()
      ];

      // Add socket strategy if IO is available
      if (container.io) {
        strategies.push(new SocketNotificationStrategy(container.io));
      }

      return new NotificationService(strategies);
    });
  }

  /**
   * Initialize all core services
   */
  initialize() {
    // Repositories
    this.register('orderRepository', () => new OrderRepository(Order));
    this.register('foodRepository', () => new FoodRepository(Food));

    // Cache Service
    this.register('cacheService', () => new CacheService(redis));

    // Notification Service (will be updated when Socket.IO is set)
    this.registerNotificationService();

    // Order Service
    this.register('orderService', (container) => new OrderService(
      container.resolve('orderRepository'),
      container.resolve('notificationService'),
      container.resolve('cacheService')
    ));
  }
}

// Create and export singleton container
export const container = new DIContainer();
container.initialize();
