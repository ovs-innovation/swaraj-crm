module.exports = {
  apps: [
    {
      name: 'swaraj-crm',
      cwd: __dirname,
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      env: { NODE_ENV: 'production' },
    },
  ],
};
