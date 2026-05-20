import express from 'express';
import { sendPushToUser } from '../utils/sendPushNotification.js';

const router = express.Router();

/**
 * TEST ENDPOINT - Send test push notification
 * GET /api/test-push?email=user@example.com
 */
router.get('/test-push', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email query parameter required',
        usage: '/api/test-push?email=user@example.com'
      });
    }

    console.log(`📱 Sending test push notification to: ${email}`);
    
    const result = await sendPushToUser(
      email,
      '🧪 Test Notification',
      'This is a test push notification from your Food Fantasy app!',
      {
        tag: 'test-notification',
        data: { type: 'test', timestamp: Date.now() }
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: `Test notification sent to ${email}`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send test notification'
      });
    }
  } catch (error) {
    console.error('Test push error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
