const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      connectionTimeoutMillis: 5000
    });
    this._testConnection();
  }

  async _testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('Conectado ao banco de dados PostgreSQL');
      client.release();
    } catch (err) {
      console.error('Erro inicial ao conectar com o banco de dados:', err);
      // A aplicação irá falhar ao iniciar se não conseguir conectar, o que é o comportamento desejado.
    }
  }

  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  
  async run(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result; 
    } finally {
      client.release();
    }
  }

  async get(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async all(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

// A MUDANÇA CRÍTICA: Exportamos uma única instância já criada.
module.exports = new Database();