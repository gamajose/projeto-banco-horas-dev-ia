-- Arquivo: schema.sql
-- Este script contém a estrutura completa do banco de dados para o projeto Banco de Horas.

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
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
);

-- Tabela de Setores
CREATE TABLE IF NOT EXISTS setores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Perfis de Funcionários
CREATE TABLE IF NOT EXISTS perfis (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  setor_id INT REFERENCES setores(id),
  cargo VARCHAR(255),
  carga_horaria_primeira INT DEFAULT 480,
  carga_horaria_segunda INT DEFAULT 240,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Status das Movimentações
CREATE TABLE IF NOT EXISTS status_movimentacao (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  cor VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Formas de Pagamento/Compensação
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Movimentações (Banco de Horas)
CREATE TABLE IF NOT EXISTS movimentacoes (
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
);

-- Tabela de Logs de Auditoria das Movimentações
CREATE TABLE IF NOT EXISTS logs_movimentacao (
  id SERIAL PRIMARY KEY,
  movimentacao_id INT NOT NULL REFERENCES movimentacoes(id),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  acao VARCHAR(100) NOT NULL,
  valores_antigos TEXT,
  valores_novos TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- INSERÇÃO DE DADOS INICIAIS ESSENCIAIS --

-- Inserir Status Padrão
INSERT INTO status_movimentacao (nome, cor) VALUES ('Pendente', '#F59E0B');
INSERT INTO status_movimentacao (nome, cor) VALUES ('Aprovado', '#10B981');
INSERT INTO status_movimentacao (nome, cor) VALUES ('Rejeitado', '#EF4444');

-- Inserir Formas de Pagamento Padrão
INSERT INTO formas_pagamento (nome, descricao) VALUES ('Horas Extras', 'Pagamento em dinheiro das horas extras');
INSERT INTO formas_pagamento (nome, descricao) VALUES ('Banco de Horas', 'Acúmulo no banco de horas');
INSERT INTO formas_pagamento (nome, descricao) VALUES ('Folga Compensatória', 'Folga para compensar horas extras');

-- Inserir Setores Padrão
INSERT INTO setores (nome, descricao) VALUES ('Administração', 'Setor administrativo da empresa');
INSERT INTO setores (nome, descricao) VALUES ('Tecnologia', 'Setor de desenvolvimento e tecnologia');
INSERT INTO setores (nome, descricao) VALUES ('Recursos Humanos', 'Setor de gestão de pessoas');