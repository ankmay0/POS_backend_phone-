import { sendPushToUser, sendPushToAdmins } from '../utils/sendPushNotification.js';

/**
 * Push Notification Strategy
 * Sends web push notifications to users and admins
 */
export class PushNotificationStrategy {
  async handleNewOrder(order) {
    try {
      // Notify user
      if (order.userEmail) {
        await sendPushToUser(
          order.userEmail,
          '📦 Order Placed!',
          `Your order for ${order.foodName} has been placed successfully!`,
          {
            tag: `order-${order._id}`,
            data: { orderId: order._id, type: 'new_order' }
          }
        );
      }

      // Notify admins
      await sendPushToAdmins(
        '📢 New Order Placed!',
        `New order from ${order.userEmail || 'Guest'} for ${order.foodName}`,
        {
          tag: `admin-order-${order._id}`,
          data: { orderId: order._id, type: 'new_order_admin' }
        }
      );
    } catch (error) {
      console.error('Push notification error:', error.message);
      //  Non-critical, don't throw
    }
  }

  async handleStatusChange(order) {
    try {
      const statusMessages = {
        Order: '📦 Your order has been placed',
        Preparing: '👨‍🍳 Your order is being prepared',
        Served: '🍽️ Your order has been served',
        Completed: '🎉 Your order is complete!'
      };

      if (order.userEmail && statusMessages[order.status]) {
        await sendPushToUser(
          order.userEmail,
          statusMessages[order.status],
          `${order.foodName} - Status: ${order.status}`,
          {
            tag: `order-${order._id}`,
            data: { orderId: order._id, status: order.status, type: 'status_change' }
          }
        );
      }
    } catch (error) {
      console.error('Push notification error:', error.message);
    }
  }

  async handlePaymentSuccess(order) {
    // Push notifications for payment handled separately
  }

  async handleOrderDeleted(orderId) {
    // Push notifications for deletion handled separately
  }
}
