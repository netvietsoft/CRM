// PM2 process config for the CRM Next.js frontend on staging.
// fork/1 for staging simplicity (Next has its own workers). Port 3069
// (behind nginx + Cloudflare). `next start -p 3069` sets the listen port.
module.exports = {
  apps: [
    {
      name: "chy_crm_fe",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3069",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3069,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      time: true,
    },
  ],
};
