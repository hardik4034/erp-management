module.exports = {
  apps : [{
    name: "hrms-backend",
    script: "server.js",
    cwd: ".",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: "production",
      PORT: 5000
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "logs/error.log",
    out_file: "logs/out.log",
    merge_logs: true
  }]
};
