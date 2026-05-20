/**
 * Notification Service
 * Handles all notifications using Strategy Pattern (OCP)
 * Supports multiple notification channels (push, socket, email)
 */
export class NotificationService {
  constructor(strategies = []) {
    this.strategies = strategies;
  }

  /**
   * Add a notification strategy
   */
  addStrategy(strategy) {
    this.strategies.push(strategy);
  }

  /**
   * Notify new order (to all strategies)
   */
  async notifyNewOrder(order) {
    const promises = this.strategies.map(strategy => 
      strategy.handleNewOrder(order).catch(err => {
        console.error(`Strategy ${strategy.constructor.name} failed:`, err.message);
        return null; // Continue with other strategies
      })
    );
    
    return await Promise.allSettled(promises);
  }

  /**
   * Notify order status change
   */
  async notifyOrderStatusChange(order) {
    const promises = this.strategies.map(strategy => 
      strategy.handleStatusChange(order).catch(err => {
        console.error(`Strategy ${strategy.constructor.name} failed:`, err.message);
        return null;
      })
    );
    
    return await Promise.allSettled(promises);
  }

  /**
   * Notify payment success
   */
  async notifyPaymentSuccess(order) {
    const promises = this.strategies.map(strategy => 
      strategy.handlePaymentSuccess(order).catch(err => {
        console.error(`Strategy ${strategy.constructor.name} failed:`, err.message);
        return null;
      })
    );
    
    return await Promise.allSettled(promises);
  }

  /**
   * Notify order deleted
   */
  async notifyOrderDeleted(orderId) {
    const promises = this.strategies.map(strategy => 
      strategy.handleOrderDeleted(orderId).catch(err => {
        console.error(`Strategy ${strategy.constructor.name} failed:`, err.message);
        return null;
      })
    );
    
    return await Promise.allSettled(promises);
  }
}
