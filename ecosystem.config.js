require('dotenv').config(); // carrega as variáveis do .env

module.exports = {
  apps: [{
    name: 'banco-de-horas',
    script: 'src/app.js',
    cwd: '/home/user/webapp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || 8001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 8000,

      // Banco de Dados PostgreSQL
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_DATABASE: process.env.DB_DATABASE,

      // JWT / Sessão
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      SESSION_SECRET: process.env.SESSION_SECRET,
      BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,

      // GitHub
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      GITHUB_REPO: process.env.GITHUB_REPO,

      // Email
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,

      // URL Base da Aplicação
      APP_BASE_URL: process.env.APP_BASE_URL
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};