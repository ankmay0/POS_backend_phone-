// Vercel serverless function entry point
// This file imports and exports the Express app from the root server.js
import app from "../server.js";

// Export the app as the default handler for Vercel
export default app;

// Also export as a named handler (Vercel supports both)
export const handler = app;

