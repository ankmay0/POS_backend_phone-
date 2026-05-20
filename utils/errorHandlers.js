// ========================================
// 🚨 CRITICAL: Global Error Handlers
// ========================================
// These prevent the server from crashing due to unhandled errors

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  console.error('Promise:', promise);
  // Log but don't crash the server
});

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  // Log but try to gracefully handle
  // In production, you might want to restart the server after logging
});

export {}; // Make this a module
