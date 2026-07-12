// PM2 process configuration for production.
// Start with:  pm2 start ecosystem.config.cjs
// Runs on its own port (default 3100) in fork mode so it won't clash with other apps.
// To change the port, edit the "-p 3100" in args below.
module.exports = {
  apps: [
    {
      name: "palmyra-automotive",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
