// PM2 process configuration for production.
// Start with:  pm2 start ecosystem.config.cjs
// Runs on its own port (default 3100) so it won't clash with other apps on the VPS.
// Override the port with:  PORT=3123 pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "palmyra-automotive",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3100,
      },
    },
  ],
};
