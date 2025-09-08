const { Pool } = require('pg');

class Database {
  constructor() {
    this.initPostgreSQL();
  }


  // ------------------------------
  // Inicialização do PostgreSQL
  // ------------------------------
  initPostgreSQL() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      connectionTimeoutMillis: 5000,
    });
    this.type = 'postgresql';
    this._testConnection();
    this.createTablesPostgres();
  }


  // ------------------------------
  // Criação de tabelas no PostgreSQL
  // ------------------------------
  async createTablesPostgres() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_staff BOOLEAN DEFAULT false,
        is_manager BOOLEAN DEFAULT false,
        foto_url TEXT,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS setores (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id),
        setor_id INT REFERENCES setores(id),
        cargo VARCHAR(255),
        carga_horaria_primeira INT DEFAULT 480,
        carga_horaria_segunda INT DEFAULT 240,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS status_movimentacao (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        cor VARCHAR(7) DEFAULT '#6B7280',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS formas_pagamento (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS movimentacoes (
        id SERIAL PRIMARY KEY,
        perfil_id INT NOT NULL REFERENCES perfis(id),
        data_movimentacao DATE NOT NULL,
        hora_entrada TIME,
        hora_saida TIME,
        hora_total VARCHAR(10),
        entrada BOOLEAN DEFAULT true,
        status_id INT DEFAULT 1 REFERENCES status_movimentacao(id),
        forma_pagamento_id INT DEFAULT 1 REFERENCES formas_pagamento(id),
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS logs_movimentacao (
        id SERIAL PRIMARY KEY,
        movimentacao_id INT NOT NULL REFERENCES movimentacoes(id),
        usuario_id INT NOT NULL REFERENCES usuarios(id),
        acao VARCHAR(100) NOT NULL,
        valores_antigos TEXT,
        valores_novos TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    await this.insertDefaultData();
  }

  // ------------------------------
  // Dados iniciais
  // ------------------------------
  async insertDefaultData() {
    const bcrypt = require('bcryptjs');

    // Status
    const statusExists = await this.get("SELECT COUNT(*) as count FROM status_movimentacao");
    if (statusExists && statusExists.count === 0) {
      await this.run("INSERT INTO status_movimentacao (nome, cor) VALUES ($1, $2)", ['Pendente', '#F59E0B']);
      await this.run("INSERT INTO status_movimentacao (nome, cor) VALUES ($1, $2)", ['Aprovado', '#10B981']);
      await this.run("INSERT INTO status_movimentacao (nome, cor) VALUES ($1, $2)", ['Rejeitado', '#EF4444']);
    }

    // Formas de pagamento
    const paymentExists = await this.get("SELECT COUNT(*) as count FROM formas_pagamento");
    if (paymentExists && paymentExists.count === 0) {
      await this.run("INSERT INTO formas_pagamento (nome, descricao) VALUES ($1, $2)", ['Horas Extras', 'Pagamento em dinheiro das horas extras']);
      await this.run("INSERT INTO formas_pagamento (nome, descricao) VALUES ($1, $2)", ['Banco de Horas', 'Acúmulo no banco de horas']);
      await this.run("INSERT INTO formas_pagamento (nome, descricao) VALUES ($1, $2)", ['Folga Compensatória', 'Folga para compensar horas extras']);
    }

    // Setores
    const sectorExists = await this.get("SELECT COUNT(*) as count FROM setores");
    if (sectorExists && sectorExists.count === 0) {
      await this.run("INSERT INTO setores (nome, descricao) VALUES ($1, $2)", ['Administração', 'Setor administrativo da empresa']);
      await this.run("INSERT INTO setores (nome, descricao) VALUES ($1, $2)", ['Tecnologia', 'Setor de desenvolvimento e tecnologia']);
      await this.run("INSERT INTO setores (nome, descricao) VALUES ($1, $2)", ['Recursos Humanos', 'Setor de gestão de pessoas']);
    }

    // Usuário administrador
    const userExists = await this.get("SELECT COUNT(*) as count FROM usuarios");
    if (userExists && userExists.count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const result = await this.run(
        "INSERT INTO usuarios (first_name, last_name, email, password, is_active, is_staff, is_manager) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id", 
        ['Admin', 'Sistema', 'admin@bancohoras.com', hashedPassword, true, true, true]
      );

      const sectorId = await this.get("SELECT id FROM setores WHERE nome = 'Administração'");
      await this.run(
        "INSERT INTO perfis (usuario_id, setor_id, cargo) VALUES ($1, $2, $3)",
        [result.rows ? result.rows[0].id : result.lastID, sectorId.id, 'Administrador do Sistema']
      );

      console.log('Usuário administrador criado: admin@bancohoras.com / admin123');
    }
  }

  // ------------------------------
  // Testar conexão
  // ------------------------------
  async _testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('Conectado ao banco de dados PostgreSQL');
      client.release();
    } catch (err) {
      console.error('Erro inicial ao conectar com o banco de dados:', err);
    }
  }

  // ------------------------------
  // Métodos genéricos
  // ------------------------------
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
        this.db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
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

module.exports = new Database();
