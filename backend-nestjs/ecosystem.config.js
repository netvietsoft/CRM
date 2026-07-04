// PM2 process config for the CRM NestJS backend on staging.
// fork/1 is REQUIRED: @nestjs/schedule crons + BullMQ processors + socket.io
// all run in-process; cluster (instances > 1) would double-fire crons and
// fragment websocket state. Port 3070 (behind nginx + Cloudflare).
module.exports = {
  apps: [
    {
      name: 'chy_crm_backend',
      cwd: __dirname,
      script: 'dist/src/main.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8070,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      time: true,
    },
  ],
};
