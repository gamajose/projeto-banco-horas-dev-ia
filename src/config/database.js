const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    // Use SQLite for development, PostgreSQL for production
    if (process.env.DB_TYPE === 'sqlite' || process.env.NODE_ENV === 'development') {
      this.initSQLite();
    } else {
      this.initPostgreSQL();
    }
  }

  initSQLite() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar com SQLite:', err);
      } else {
        console.log('Conectado ao banco de dados SQLite');
        this.createTables();
      }
    });
    this.type = 'sqlite';
  }

  initPostgreSQL() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      connectionTimeoutMillis: 5000
    });
    this.type = 'postgresql';
    this._testConnection();
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        is_staff BOOLEAN DEFAULT 0,
        is_manager BOOLEAN DEFAULT 0,
        foto_url TEXT,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS setores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome VARCHAR(255) NOT NULL UNIQUE,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS perfis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        setor_id INTEGER,
        cargo VARCHAR(255),
        carga_horaria_primeira INTEGER DEFAULT 480,
        carga_horaria_segunda INTEGER DEFAULT 240,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (setor_id) REFERENCES setores(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS status_movimentacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome VARCHAR(100) NOT NULL UNIQUE,
        cor VARCHAR(7) DEFAULT '#6B7280',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS formas_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome VARCHAR(100) NOT NULL UNIQUE,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        perfil_id INTEGER NOT NULL,
        data_movimentacao DATE NOT NULL,
        hora_entrada TIME,
        hora_saida TIME,
        hora_total VARCHAR(10),
        entrada BOOLEAN DEFAULT 1,
        status_id INTEGER DEFAULT 1,
        forma_pagamento_id INTEGER DEFAULT 1,
        observacao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (perfil_id) REFERENCES perfis(id),
        FOREIGN KEY (status_id) REFERENCES status_movimentacao(id),
        FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS logs_movimentacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movimentacao_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        acao VARCHAR(100) NOT NULL,
        valores_antigos TEXT,
        valores_novos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (movimentacao_id) REFERENCES movimentacoes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Insert default data
    await this.insertDefaultData();
  }

  async insertDefaultData() {
    // Insert default status
    const statusExists = await this.get("SELECT COUNT(*) as count FROM status_movimentacao");
    if (statusExists.count === 0) {
      await this.run("INSERT INTO status_movimentacao (nome, cor) VALUES (?, ?)", ['Pendente', '#F59E0B']);
      await this.run("INSERT INTO status_movimentacao (nome, cor) VALUES (?, ?)", ['Aprovado', '#10B981']);
      await this.run("INSERT INTO status_movimentacao (nome, cor) VALUES (?, ?)", ['Rejeitado', '#EF4444']);
    }

    // Insert default payment methods
    const paymentExists = await this.get("SELECT COUNT(*) as count FROM formas_pagamento");
    if (paymentExists.count === 0) {
      await this.run("INSERT INTO formas_pagamento (nome, descricao) VALUES (?, ?)", ['Horas Extras', 'Pagamento em dinheiro das horas extras']);
      await this.run("INSERT INTO formas_pagamento (nome, descricao) VALUES (?, ?)", ['Banco de Horas', 'Acúmulo no banco de horas']);
      await this.run("INSERT INTO formas_pagamento (nome, descricao) VALUES (?, ?)", ['Folga Compensatória', 'Folga para compensar horas extras']);
    }

    // Insert default sector
    const sectorExists = await this.get("SELECT COUNT(*) as count FROM setores");
    if (sectorExists.count === 0) {
      await this.run("INSERT INTO setores (nome, descricao) VALUES (?, ?)", ['Administração', 'Setor administrativo da empresa']);
      await this.run("INSERT INTO setores (nome, descricao) VALUES (?, ?)", ['Tecnologia', 'Setor de desenvolvimento e tecnologia']);
      await this.run("INSERT INTO setores (nome, descricao) VALUES (?, ?)", ['Recursos Humanos', 'Setor de gestão de pessoas']);
    }

    // Create default admin user
    const bcrypt = require('bcryptjs');
    const userExists = await this.get("SELECT COUNT(*) as count FROM usuarios");
    if (userExists.count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const result = await this.run(
        "INSERT INTO usuarios (first_name, last_name, email, password, is_active, is_staff, is_manager) VALUES (?, ?, ?, ?, ?, ?, ?)", 
        ['Admin', 'Sistema', 'admin@bancohoras.com', hashedPassword, 1, 1, 1]
      );
      
      // Create profile for admin user
      const sectorId = await this.get("SELECT id FROM setores WHERE nome = 'Administração'");
      await this.run(
        "INSERT INTO perfis (usuario_id, setor_id, cargo) VALUES (?, ?, ?)",
        [result.lastID || 1, sectorId.id, 'Administrador do Sistema']
      );
      
      console.log('Usuário administrador criado: admin@bancohoras.com / admin123');
    }
  }

  async _testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('Conectado ao banco de dados PostgreSQL');
      client.release();
    } catch (err) {
      console.error('Erro inicial ao conectar com o banco de dados:', err);
    }
  }

  async query(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    } else {
      const client = await this.pool.connect();
      try {
        return await client.query(sql, params);
      } finally {
        client.release();
      }
    }
  }

  async run(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    } else {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result;
      } finally {
        client.release();
      }
    }
  }

  async get(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } else {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows[0];
      } finally {
        client.release();
      }
    }
  }

  async all(sql, params = []) {
    if (this.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    } else {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows;
      } finally {
        client.release();
      }
    }
  }
}

// A MUDANÇA CRÍTICA: Exportamos uma única instância já criada.
module.exports = new Database();