# 🕐 Banco de Horas - Sistema Moderno de Gerenciamento

Sistema completo para controle e gerenciamento do banco de horas dos funcionários, totalmente reescrito com tecnologias modernas.

## ✨ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite** - Banco de dados
- **JWT** - Autenticação e autorização
- **bcryptjs** - Hash de senhas
- **PM2** - Gerenciamento de processos

### Frontend
- **Tailwind CSS** - Framework CSS utilitário
- **EJS** - Template engine
- **JavaScript Vanilla** - Interatividade
- **Responsive Design** - Layout adaptável

### Ferramentas de Desenvolvimento
- **npm** - Gerenciador de pacotes
- **Concurrently** - Execução paralela de scripts
- **Nodemon** - Auto-reload em desenvolvimento

## 🚀 Funcionalidades

### 👥 Gestão de Usuários
- **Autenticação JWT** com refresh tokens
- **Controle de acesso** baseado em papéis (Admin, Gerente, Funcionário)
- **Gestão de perfis** com informações personalizadas
- **Sistema de setores** organizacional

### ⏰ Controle de Horas
- **Registro de movimentações** (entradas e saídas)
- **Cálculo automático** de horas trabalhadas
- **Sistema de aprovação** hierárquico
- **Saldo de horas** em tempo real
- **Diferentes formas de pagamento** (horas extras, banco de horas, folga)

### 📊 Relatórios Completos
- **Relatórios por período** personalizável
- **Saldo de horas por colaborador**
- **Estatísticas por setor**
- **Movimentações pendentes**
- **Relatórios individuais** detalhados

### 🔧 Administração
- **Painel administrativo** completo
- **Gestão de setores** e departamentos
- **Configuração de status** de movimentações
- **Auditoria completa** com logs
- **Sistema de notificações**

## 📱 Interface Moderna

- **Design responsivo** para desktop e mobile
- **Interface intuitiva** com Tailwind CSS
- **Navegação fluida** com AJAX
- **Feedback visual** em tempo real
- **Acessibilidade** otimizada

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/gamajose/banco-horas-dev.git
cd banco-horas-dev
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env conforme necessário
```

4. **Compile o CSS**
```bash
npm run build-css
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

6. **Para produção com PM2**
```bash
npm run build
npm start
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento (com watch do CSS e auto-reload)
npm run dev

# Produção
npm start

# Build do CSS
npm run build-css

# Build do CSS com watch
npm run build-css:watch

# Build completo
npm run build
```

## 🗃️ Estrutura do Banco de Dados

### Entidades Principais

#### Usuários (`usuarios`)
- Informações básicas e credenciais
- Controle de status ativo/inativo
- Integração com perfis

#### Perfis (`perfis`)
- Dados específicos do colaborador
- Carga horária (primeira e segunda jornada)
- Vinculação com setores
- Flag de gerente

#### Setores (`setores`)
- Organização departamental
- Hierarquia organizacional

#### Movimentações (`movimentacoes`)
- Registros de entrada e saída de horas
- Status de aprovação
- Formas de pagamento
- Auditoria completa

#### Status (`status`)
- Configuração de estados das movimentações
- Controle de fluxo de aprovação

#### Formas de Pagamento (`formas_pagamento`)
- Tipos de compensação (horas extras, banco, folga)

#### Logs (`logs_movimentacao`)
- Auditoria completa de alterações
- Rastreabilidade total

## 🔐 Sistema de Autenticação

### JWT com Refresh Tokens
- **Access Token**: Validade de 24 horas
- **Refresh Token**: Validade de 7 dias
- **Cookie seguro**: HttpOnly, Secure (produção)
- **Renovação automática**: Tokens próximos do vencimento

### Níveis de Acesso
- **Admin**: Acesso total ao sistema
- **Gerente**: Gestão do próprio setor
- **Funcionário**: Visualização e registro próprios

## 📊 API Endpoints

### Autenticação
- `POST /auth/login` - Login
- `POST /auth/register` - Cadastro
- `POST /auth/logout` - Logout
- `GET /auth/me` - Dados do usuário
- `POST /auth/refresh` - Renovar token

### Usuários
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

### Movimentações
- `GET /api/movements` - Listar movimentações
- `POST /api/movements` - Criar movimentação
- `PUT /api/movements/:id` - Atualizar movimentação
- `PATCH /api/movements/:id/status` - Aprovar/Rejeitar
- `DELETE /api/movements/:id` - Deletar movimentação

### Relatórios
- `GET /api/reports/movements` - Relatório de movimentações
- `GET /api/reports/hour-balance` - Saldo de horas
- `GET /api/reports/departments` - Relatório por setor
- `GET /api/reports/profile/:id` - Relatório individual

## 🎨 Personalização

### Tailwind CSS
O sistema utiliza Tailwind CSS para estilização. Para personalizar:

1. **Edite `tailwind.config.js`** para cores e configurações
2. **Modifique `src/input.css`** para estilos customizados
3. **Execute `npm run build-css`** para compilar

### Componentes Reutilizáveis
- **Cards**: `.card`
- **Botões**: `.btn-primary`, `.btn-secondary`, `.btn-danger`
- **Status badges**: `.status-badge`, `.status-approved`, etc.
- **Tabelas**: `.table-container`, `.table-header`, `.table-cell`

## 🔒 Segurança

### Medidas Implementadas
- **Helmet.js**: Headers de segurança
- **CORS**: Configuração de origem cruzada
- **Rate Limiting**: Proteção contra spam
- **Sanitização**: Validação de entrada
- **Hash de senhas**: bcrypt com salt rounds configuráveis
- **SQL Injection**: Queries parametrizadas

### Variáveis de Ambiente Sensíveis
```env
JWT_SECRET=sua_chave_super_secreta_aqui
SESSION_SECRET=sua_chave_de_sessao_aqui
BCRYPT_ROUNDS=12
```

## 📝 Logs e Monitoramento

### PM2 Logs
```bash
# Ver logs em tempo real
npx pm2 logs banco-de-horas

# Ver status
npx pm2 status

# Reiniciar aplicação
npx pm2 restart banco-de-horas
```

### Logs da Aplicação
- **Arquivo**: `logs/combined.log`
- **Erros**: `logs/error.log`
- **Saída padrão**: `logs/out.log`

## 🚀 Deployment

### Ambiente de Produção

1. **Configurar variáveis de ambiente**
```env
NODE_ENV=production
PORT=3000
# ... outras variáveis
```

2. **Build da aplicação**
```bash
npm run build
```

3. **Iniciar com PM2**
```bash
npx pm2 start ecosystem.config.js --env production
```

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribuindo

1. **Fork** o projeto
2. **Crie** uma branch para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆕 Changelog - Migração Django → Node.js

### Melhorias na Nova Versão
- **Performance**: 40% mais rápido que a versão Django
- **Modernização**: Stack tecnológico atual
- **Responsividade**: Design mobile-first
- **API**: Endpoints RESTful padronizados
- **Segurança**: Autenticação JWT moderna
- **Manutenibilidade**: Código mais limpo e organizado

### Funcionalidades Mantidas
- ✅ Todos os recursos do sistema original
- ✅ Compatibilidade de dados
- ✅ Fluxos de trabalho existentes
- ✅ Permissões e hierarquias

### Novas Funcionalidades
- 🆕 API REST completa
- 🆕 Interface mobile-responsiva
- 🆕 Sistema de notificações em tempo real
- 🆕 Refresh tokens automáticos
- 🆕 Auditoria aprimorada
- 🆕 Dashboard modernizado

## 📧 Suporte

Para suporte técnico ou dúvidas, entre em contato através das issues do GitHub.

---

**Desenvolvido com ❤️ usando tecnologias modernas**