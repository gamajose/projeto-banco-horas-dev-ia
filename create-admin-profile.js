require('dotenv').config();
const Database = require('./src/config/database');

// --- Definições ---
const ADMIN_USERNAME = 'admin'; // O nome de usuário do seu admin
// --------------------

async function createAdminProfile() {
  console.log('Iniciando script para criar perfil de funcionário para o admin...');
  const database = new Database();

  try {
    await database.pool.connect();
    console.log('Conectado ao banco de dados com sucesso.');

    // 1. Encontrar o ID do usuário admin
    const adminUser = await database.get('SELECT id FROM usuarios WHERE username = $1', [ADMIN_USERNAME]);
    if (!adminUser) {
      throw new Error(`Usuário '${ADMIN_USERNAME}' não encontrado no banco de dados.`);
    }
    const adminUserId = adminUser.id;
    console.log(`ID do usuário admin encontrado: ${adminUserId}`);

    // 2. Verificar se já existe um perfil para este usuário
    const existingProfile = await database.get('SELECT id FROM perfis WHERE usuario_id = $1', [adminUserId]);
    if (existingProfile) {
      console.log('✅ O usuário admin já possui um perfil de funcionário associado. Nada a fazer.');
      return;
    }

    // 3. Encontrar o primeiro setor disponível para associar (pode ser alterado depois)
    const firstDepartment = await database.get('SELECT id FROM setores ORDER BY id LIMIT 1');
    if (!firstDepartment) {
      throw new Error('Nenhum setor encontrado no banco de dados. Crie um setor antes de criar um perfil.');
    }
    const departmentId = firstDepartment.id;
    console.log(`Usando o primeiro setor encontrado (ID: ${departmentId}) para o perfil.`);

    // 4. Criar o novo perfil na tabela 'perfis'
    const sql = `
      INSERT INTO perfis (nome, gerente, ch_primeira, ch_segunda, setor_id, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const params = [
      'Administrador do Sistema', // Nome completo do perfil
      true,                       // Definir como gerente? (Sim)
      '08:00:00',                 // Carga horária 1 (exemplo)
      '08:00:00',                 // Carga horária 2 (exemplo)
      departmentId,               // ID do setor
      adminUserId                 // ID do usuário admin
    ];

    await database.run(sql, params);

    console.log('\n✅ Perfil de funcionário para o usuário admin foi criado com sucesso!');
    console.log('Agora você pode acessar a página "Meu Perfil".');

  } catch (error) {
    console.error('\n❌ Ocorreu um erro ao executar o script:', error.message);
  } finally {
    await database.close();
    console.log('\nConexão com o banco de dados fechada.');
  }
}

createAdminProfile();