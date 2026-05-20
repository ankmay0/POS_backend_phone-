import { BaseService } from './BaseService.js';

/**
 * Order Service
 * Handles order business logic
 * Separated from controllers (SRP) and depends on abstractions (DIP)
 */
export class OrderService extends BaseService {
  constructor(orderRepository, notificationService = null, cacheService = null) {
    super(orderRepository);
    this.notificationService = notificationService;
    this.cacheService = cacheService;
  }

  /**
   * Create new order with notifications
   */
  async createOrder(orderData) {
    // Create order
    const order = await this.repository.create(orderData);

    // Invalidate cache if available
    if (this.cacheService) {
      await this.cacheService.invalidate('orders');
    }

    // Send notifications if available
    if (this.notificationService) {
      await this.notificationService.notifyNewOrder(order);
    }

    return order;
  }

  /**
   * Create multiple orders
   */
  async createMultipleOrders(ordersData) {
    const orders = await this.repository.createMany(ordersData);

    // Invalidate cache
    if (this.cacheService) {
      await this.cacheService.invalidate('orders');
    }

    // Notify for each order
    if (this.notificationService) {
      for (const order of orders) {
        await this.notificationService.notifyNewOrder(order);
      }
    }

    return orders;
  }

  /**
   * Update order status with notifications
   */
  async updateOrderStatus(orderId, statusData) {
    const order = await this.repository.update(orderId, statusData);

    if (!order) {
      throw new Error('Order not found');
    }

    // Invalidate cache
    if (this.cacheService) {
      await this.cacheService.invalidate('orders');
    }

    // Send status change notification
    if (this.notificationService && statusData.status) {
      await this.notificationService.notifyOrderStatusChange(order);
    }

    // Send payment notification
    if (this.notificationService && statusData.paymentStatus === 'Paid') {
      await this.notificationService.notifyPaymentSuccess(order);
    }

    return order;
  }

  /**
   * Delete order with notifications
   */
  async deleteOrder(orderId) {
    const order = await this.repository.delete(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Invalidate cache
    if (this.cacheService) {
      await this.cacheService.invalidate('orders');
    }

    // Notify deletion
    if (this.notificationService) {
      await this.notificationService.notifyOrderDeleted(orderId);
    }

    return order;
  }

  /**
   * Get active orders
   */
  async getActiveOrders() {
    return await this.repository.findActiveOrders();
  }

  /**
   * Get user's active orders
   */
  async getUserActiveOrders(userId, userEmail) {
    return await this.repository.findUserActiveOrders(userId, userEmail);
  }

  /**
   * Get occupied tables
   */
  async getOccupiedTables() {
    return await this.repository.getOccupiedTables();
  }
}
