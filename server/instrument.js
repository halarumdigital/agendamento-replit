// IMPORTANT: This file must be imported at the top of your main server file
// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://f248c0ac05944d199129e19d5067580c@o4507788303794176.ingest.us.sentry.io/4509616651567104",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  
  // Set sample rate for performance monitoring
  tracesSampleRate: 1.0,
  
  // Environment detection
  environment: process.env.NODE_ENV || "development",
  
  // Capture unhandled promise rejections
  captureUnhandledRejections: true,
  
  // Debug mode for development
  debug: process.env.NODE_ENV === "development",
});

export default Sentry;