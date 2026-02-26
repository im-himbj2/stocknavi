module.exports = {
  apps: [
    {
      name: 'stocknavi-backend',
      script: '/home/ec2-user/stock-portfolio/backend/venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      cwd: '/home/ec2-user/stock-portfolio/backend',
      interpreter: '/home/ec2-user/stock-portfolio/backend/venv/bin/python',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      error_file: '/home/ec2-user/.pm2/logs/stocknavi-backend-error.log',
      out_file: '/home/ec2-user/.pm2/logs/stocknavi-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'stocknavi-frontend',
      script: 'serve',
      args: '-s dist -l 5173',
      cwd: '/home/ec2-user/stock-portfolio/frontend',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/ec2-user/.pm2/logs/stocknavi-frontend-error.log',
      out_file: '/home/ec2-user/.pm2/logs/stocknavi-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
  ],
};


