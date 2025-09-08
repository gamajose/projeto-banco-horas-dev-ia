const db = require('../config/database');

class Department {
  // Cria um novo setor
  static async create(departmentData) {
    const { nome } = departmentData;
    const result = await db.run(
      'INSERT INTO setores (nome) VALUES ($1) RETURNING id',
      [nome]
    );
    return this.findById(result.rows[0].id);
  }

  // Busca um setor pelo ID
  static async findById(id) {
    return await db.get('SELECT * FROM setores WHERE id = $1', [id]);
  }

  // Busca um setor pelo nome
  static async findByName(nome) {
    return await db.get('SELECT * FROM setores WHERE nome = $1', [nome]);
  }

  // Lista todos os setores
  static async findAll() {
    // Nova query que conta quantos colaboradores (perfis) estão em cada setor
    const sql = `
        SELECT 
            s.id, 
            s.nome, 
            COUNT(p.id) as colaborador_count
        FROM 
            setores s
        LEFT JOIN 
            perfis p ON s.id = p.setor_id
        GROUP BY 
            s.id, s.nome
        ORDER BY 
            s.nome ASC
    `;
    return await db.all(sql);
}

  // Atualiza um setor
  static async update(id, departmentData) {
    const { nome } = departmentData;
    await db.run(
      'UPDATE setores SET nome = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nome, id]
    );
    return this.findById(id);
  }

  // Deleta um setor (só se não houver colaboradores associados)
  static async delete(id) {
    const profiles = await db.get(
      'SELECT COUNT(*) as count FROM perfis WHERE setor_id = $1',
      [id]
    );
    if (profiles.count > 0) {
      throw new Error('Não é possível excluir um setor que possui colaboradores associados');
    }
    const result = await db.run('DELETE FROM setores WHERE id = $1', [id]);
    return result.changes > 0;
  }

  // Estatísticas do setor (total de colaboradores e gerentes)
  static async getDepartmentStats() {
    return await db.all(`
      SELECT 
        s.id,
        s.nome,
        COUNT(p.id) as total_colaboradores,
        COUNT(CASE WHEN p.gerente = TRUE THEN 1 END) as total_gerentes
      FROM setores s
      LEFT JOIN perfis p ON s.id = p.setor_id
      LEFT JOIN usuarios u ON p.usuario_id = u.id AND u.is_active = TRUE
      GROUP BY s.id, s.nome
      ORDER BY s.nome
    `);
  }
}

module.exports = Department;
