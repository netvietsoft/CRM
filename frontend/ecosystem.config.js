module.exports = {
  apps: [
    {
      name: "chy_crm_fe",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 8069",
      instances: 1,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        PORT: 8069,
        NODE_ENV: "production",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
