// PM2 process configuration for production.
// Start with:  pm2 start ecosystem.config.cjs
// The app listens on PORT (default 3000); put Nginx in front as a reverse proxy.
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
        PORT: 3000,
      },
    },
  ],
};
