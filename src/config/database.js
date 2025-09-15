const { Pool } = require('pg');

class Database {
  constructor() {
    this.initPostgreSQL();
  }

  async getClient() {
    const client = await this.pool.connect();
    return client;
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
        analise BOOLEAN DEFAULT FALSE,
        autorizado BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    try {
      // Dados padrão que queremos garantir que existam
      const defaultStatus = [
        { nome: 'Pendente', cor: '#F59E0B', analise: true, autorizado: false },
        { nome: 'Aprovado', cor: '#10B981', analise: false, autorizado: true },
        { nome: 'Rejeitado', cor: '#EF4444', analise: false, autorizado: false },
        { nome: 'Cancelado', cor: '#6B7280', analise: false, autorizado: false }
      ];

      // Insere cada status se ele não existir
       for (const status of defaultStatus) {
        const exists = await this.get("SELECT 1 FROM status_movimentacao WHERE nome = $1", [status.nome]);
        if (!exists) {
          // Usa a tabela correta que TEM a coluna "cor"
          await this.run("INSERT INTO status_movimentacao (nome, cor, analise, autorizado) VALUES ($1, $2, $3, $4)", [status.nome, status.cor, status.analise, status.autorizado]);
          console.log(`Status "${status.nome}" inserido com sucesso em status_movimentacao.`);
        }
      }

      const defaultPayments = [
        { nome: 'Horas Extras', descricao: 'Pagamento em dinheiro das horas extras' },
        { nome: 'Banco de Horas', descricao: 'Acúmulo no banco de horas' },
        { nome: 'Folga Compensatória', descricao: 'Folga para compensar horas extras' }
      ];

      // Insere cada forma de pagamento se ela não existir
      for (const payment of defaultPayments) {
        const exists = await this.get("SELECT 1 FROM formas_pagamento WHERE nome = $1", [payment.nome]);
        if (!exists) {
          await this.run("INSERT INTO formas_pagamento (nome, descricao) VALUES ($1, $2)", [payment.nome, payment.descricao]);
        }
      }

      const defaultSectors = [
        { nome: 'Administração', descricao: 'Setor administrativo da empresa' },
        { nome: 'Tecnologia', descricao: 'Setor de desenvolvimento e tecnologia' },
        { nome: 'Recursos Humanos', descricao: 'Setor de gestão de pessoas' }
      ];

      // Insere cada setor se ele não existir
      for (const sector of defaultSectors) {
        const exists = await this.get("SELECT 1 FROM setores WHERE nome = $1", [sector.nome]);
        if (!exists) {
          await this.run("INSERT INTO setores (nome, descricao) VALUES ($1, $2)", [sector.nome, sector.descricao]);
        }
      }

      // Cria usuário administrador apenas se não houver nenhum usuário
      const userCount = await this.get("SELECT COUNT(*) as count FROM usuarios");

      if (userCount && userCount.count === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const result = await this.run(
          "INSERT INTO usuarios (first_name, last_name, email, password_hash, is_active, is_staff) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", 
          ['admin', 'Sistema', 'admin@bancohoras.com', hashedPassword, true, true]
        );
        const adminId = result.rows[0].id;
        const sector = await this.get("SELECT id FROM setores WHERE nome = 'Administração'");
        if (sector) {
            await this.run(
              "INSERT INTO perfis (usuario_id, setor_id, nome, gerente, funcao) VALUES ($1, $2, $3, $4, $5)",
              [adminId, sector.id, 'Administrador do Sistema', true, 'Administrador']
            );
        }
        console.log('Usuário administrador criado: admin@bancohoras.com / admin123');
      }

    } catch (error) {
        console.error("Erro ao inserir dados padrão:", error);
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
