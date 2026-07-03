// PM2 ecosystem — CRM netvietsoft
// Server: /home/netviet/projects-deploy/CRM
//   BE   : api.lestgoai.com   → 127.0.0.1:8070  (NestJS)
//   FE   : lestgoai.com       → 127.0.0.1:3069  (Next, cổng khách)
//   Admin: admin.lestgoai.com → 127.0.0.1:3070  (Next, cùng build — instance thứ 2)
//
// Chạy:  pm2 start ecosystem.config.js  &&  pm2 save
// Secrets (DATABASE_URL, JWT_SECRET, META_ADS_*, VIETTELPOST_*, GOOGLE_*, REDIS_*, SMTP_* ...)
// đặt trong backend-nestjs/.env (NestJS ConfigModule tự nạp). Ở đây chỉ set biến hạ tầng.

const APP_DIR = '/home/netviet/projects-deploy/CRM';
const ORIGINS = 'https://lestgoai.com,https://admin.lestgoai.com';

module.exports = {
  apps: [
    {
      name: 'crm-backend',
      cwd: `${APP_DIR}/backend-nestjs`,
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: '8070',
        CORS: ORIGINS,
        FRONTEND_URL: ORIGINS,
      },
    },
    {
      name: 'crm-frontend',
      cwd: `${APP_DIR}/frontend`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3069',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3069',
      },
    },
    {
      // Cùng build với crm-frontend, chạy thêm 1 instance cho domain admin.
      // (Muốn tiết kiệm RAM: bỏ app này, trỏ cả 2 domain vào cổng 3069 ở Nginx.)
      name: 'crm-admin',
      cwd: `${APP_DIR}/frontend`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3070',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3070',
      },
    },
  ],
};
