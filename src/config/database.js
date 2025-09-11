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
        username VARCHAR(100) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_staff BOOLEAN DEFAULT false,
        force_password_change BOOLEAN DEFAULT TRUE,
        reset_password_token TEXT,
        reset_password_expires TIMESTAMP,
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
        usuario_id INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
        setor_id INT REFERENCES setores(id) ON DELETE SET NULL,
        nome VARCHAR(255),
        gerente BOOLEAN DEFAULT FALSE,
        ch_primeira TIME,
        ch_segunda TIME,
        foto_url TEXT,
        data_nascimento DATE,
        sexo VARCHAR(50),
        cpf VARCHAR(20),
        telefone VARCHAR(20),
        linkedin VARCHAR(255),
        cep VARCHAR(10),
        logradouro VARCHAR(255),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(50),
        numero VARCHAR(20),
        funcao VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS status (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        analise BOOLEAN DEFAULT FALSE,
        autorizado BOOLEAN DEFAULT FALSE,
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
      `CREATE TABLE IF NOT EXISTS movimentacoes (
        id SERIAL PRIMARY KEY,
        colaborador_id INT NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
        data_movimentacao DATE NOT NULL,
        hora_inicial TIME,
        hora_final TIME,
        hora_total VARCHAR(10),
        motivo TEXT,
        entrada BOOLEAN DEFAULT true,
        status_id INT REFERENCES status(id),
        forma_pagamento_id INT REFERENCES formas_pagamento(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS movimentacoes_logs (
        id SERIAL PRIMARY KEY,
        movimentacao_id INT NOT NULL REFERENCES movimentacoes(id) ON DELETE CASCADE,
        usuario_id INT NOT NULL REFERENCES usuarios(id),
        acao VARCHAR(100) NOT NULL,
        detalhes TEXT,
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
        ['admin', 'Sistema', 'admin@bancohoras.com', hashedPassword, true, true, true]
      );

      const adminId = result.rows ? result.rows[0].id : result.lastID;

      const sector = await this.get("SELECT id FROM setores WHERE nome = 'Administração'");
      await this.run(
        "INSERT INTO perfis (usuario_id, setor_id, nome, gerente, funcao) VALUES ($1, $2, $3, $4, $5)",
        [adminId, sector.id, 'Administrador do Sistema', true, 'Administrador']
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
  // async query(sql, params = []) {
  //   if (this.type === 'sqlite') {
  //     return new Promise((resolve, reject) => {
  //       this.db.all(sql, params, (err, rows) => {
  //         if (err) reject(err);
  //         else resolve({ rows });
  //       });
  //     });
  //   } else {
  //     const client = await this.pool.connect();
  //     try {
  //       return await client.query(sql, params);
  //     } finally {
  //       client.release();
  //     }
  //   }
  // }

  // async run(sql, params = []) {
  //   if (this.type === 'sqlite') {
  //     return new Promise((resolve, reject) => {
  //       this.db.run(sql, params, function (err) {
  //         if (err) reject(err);
  //         else resolve({ lastID: this.lastID, changes: this.changes });
  //       });
  //     });
  //   } else {
  //     const client = await this.pool.connect();
  //     try {
  //       return await client.query(sql, params);
  //     } finally {
  //       client.release();
  //     }
  //   }
  // }

  // async get(sql, params = []) {
  //   if (this.type === 'sqlite') {
  //     return new Promise((resolve, reject) => {
  //       this.db.get(sql, params, (err, row) => {
  //         if (err) reject(err);
  //         else resolve(row);
  //       });
  //     });
  //   } else {
  //     const client = await this.pool.connect();
  //     try {
  //       const result = await client.query(sql, params);
  //       return result.rows[0];
  //     } finally {
  //       client.release();
  //     }
  //   }
  // }

  // async all(sql, params = []) {
  //   if (this.type === 'sqlite') {
  //     return new Promise((resolve, reject) => {
  //       this.db.all(sql, params, (err, rows) => {
  //         if (err) reject(err);
  //         else resolve(rows);
  //       });
  //     });
  //   } else {
  //     const client = await this.pool.connect();
  //     try {
  //       const result = await client.query(sql, params);
  //       return result.rows;
  //     } finally {
  //       client.release();
  //     }
  //   }
  // }
   // ------------------------------
  // Métodos genéricos
  // ------------------------------
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
        return await client.query(sql, params);
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

module.exports = new Database();
