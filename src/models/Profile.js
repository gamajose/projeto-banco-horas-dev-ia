const db = require("../config/database");

class Profile {
  /**
   * Calcula a carga horária diária de um perfil em minutos.
   * Assume 1 hora de almoço para jornadas acima de 6 horas.
   * @param {number} profileId - O ID do perfil.
   * @returns {Promise<number>} A carga horária diária em minutos.
   */

  static async getDailyWorkHoursInMinutes(profileId) {
    const profile = await this.findById(profileId);
    if (!profile || !profile.ch_primeira || !profile.ch_segunda) {
      return 480; // Retorna um padrão de 8 horas (480 minutos) se não estiver configurado
    }

    const [startHour, startMinute] = profile.ch_primeira.split(":").map(Number);
    const [endHour, endMinute] = profile.ch_segunda.split(":").map(Number);

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    let diffInMinutes = endTimeInMinutes - startTimeInMinutes;

    // Assumir 1h (60 min) de almoço para jornadas de 6h ou mais
    if (diffInMinutes >= 360) {
      diffInMinutes -= 60;
    }

    return diffInMinutes > 0 ? diffInMinutes : 0;
  }

  static async findById(id) {
    const sql = `
        SELECT p.*, u.username, u.email, u.first_name, u.last_name, u.is_active
        FROM perfis p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.id = $1
    `;
    return await db.get(sql, [id]);
  }

  // Métodos agora são estáticos
  static async findByUserId(usuario_id) {
    const sql = `
      SELECT p.*, s.nome as setor_nome 
      FROM perfis p
      LEFT JOIN setores s ON p.setor_id = s.id
      WHERE p.usuario_id = $1
    `;
    return await db.get(sql, [usuario_id]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT 
        p.*, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.is_active,
        u.last_login, 
        s.nome as setor_nome
      FROM perfis p
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN setores s ON p.setor_id = s.id
    `;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Adiciona a condição de filtro se um setor_id for fornecido
    if (filters.setor_id) {
      conditions.push(`p.setor_id = $${paramIndex++}`);
      params.push(filters.setor_id);
    }

    // Você pode adicionar mais filtros aqui no futuro (ex: por status, por nome, etc.)

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY p.ordem_escala, u.first_name";

    return await db.all(sql, params);
  }

  static async searchByName(query) {
    // Usamos ILIKE para uma pesquisa case-insensitive (não diferencia maiúsculas de minúsculas)
    // O '%' significa que queremos nomes que "começam com" o termo da pesquisa
    const sql = `
      SELECT p.id, p.nome, u.email, p.foto_url
      FROM perfis p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.nome ILIKE $1
      LIMIT 7
    `;
    const params = [`${query}%`];
    return await db.all(sql, params);
  }

  // NOVA FUNÇÃO PARA BUSCA COM FILTROS
  static async findAllWithFilters(filters = {}) {
    let sql =  `
      SELECT 
        p.*, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.is_active, 
        u.last_login, -- ADICIONE ESTA LINHA
        s.nome as setor_nome
      FROM perfis p
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN setores s ON p.setor_id = s.id
    `;
    const params = [];

    if (filters.gerente) {
      sql += ` AND p.gerente = TRUE`;
    }

    sql += ` ORDER BY p.nome`;

    return await db.all(sql, params);
  }

  // Nova função: Método de atualização mais robusto
  static async update(id, profileData) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    // Constrói a query dinamicamente
    if (profileData.nome) {
      fields.push(`nome = $${paramIndex++}`);
      params.push(profileData.nome);
    }
    if (profileData.gerente !== undefined) {
      fields.push(`gerente = $${paramIndex++}`);
      params.push(profileData.gerente);
    }
    if (profileData.ch_primeira) {
      fields.push(`ch_primeira = $${paramIndex++}`);
      params.push(profileData.ch_primeira);
    }
    if (profileData.ch_segunda) {
      fields.push(`ch_segunda = $${paramIndex++}`);
      params.push(profileData.ch_segunda);
    }
    if (profileData.setor_id) {
      fields.push(`setor_id = $${paramIndex++}`);
      params.push(profileData.setor_id);
    }
    if (profileData.endereco !== undefined) {
      fields.push(`endereco = $${paramIndex++}`);
      params.push(profileData.endereco);
    }
    if (profileData.foto_url) {
      fields.push(`foto_url = $${paramIndex++}`);
      params.push(profileData.foto_url);
    }

    if (profileData.data_nascimento !== undefined) {
      fields.push(`data_nascimento = $${paramIndex++}`);
      params.push(profileData.data_nascimento || null);
    }
    if (profileData.sexo !== undefined) {
      fields.push(`sexo = $${paramIndex++}`);
      params.push(profileData.sexo);
    }
    if (profileData.cpf !== undefined) {
      fields.push(`cpf = $${paramIndex++}`);
      params.push(profileData.cpf);
    }
    if (profileData.telefone !== undefined) {
      fields.push(`telefone = $${paramIndex++}`);
      params.push(profileData.telefone);
    }
    if (profileData.linkedin !== undefined) {
      fields.push(`linkedin = $${paramIndex++}`);
      params.push(profileData.linkedin);
    }
    if (profileData.cep !== undefined) {
      fields.push(`cep = $${paramIndex++}`);
      params.push(profileData.cep);
    }
    if (profileData.logradouro !== undefined) {
      fields.push(`logradouro = $${paramIndex++}`);
      params.push(profileData.logradouro);
    }
    if (profileData.bairro !== undefined) {
      fields.push(`bairro = $${paramIndex++}`);
      params.push(profileData.bairro);
    }
    if (profileData.cidade !== undefined) {
      fields.push(`cidade = $${paramIndex++}`);
      params.push(profileData.cidade);
    }
    if (profileData.estado !== undefined) {
      fields.push(`estado = $${paramIndex++}`);
      params.push(profileData.estado);
    }
    if (profileData.funcao !== undefined) {
      fields.push(`funcao = $${paramIndex++}`);
      params.push(profileData.funcao);
    }

    if (fields.length === 0) return; // Nenhum campo para atualizar

    params.push(id);
    const sql = `
          UPDATE perfis 
          SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex}
          RETURNING *
      `;
    const result = await db.get(sql, params);
    return result;
  }

  // NOVA FUNÇÃO PARA PROMOVER/DESPROMOVER
  static async updateRole(id, isGerente) {
    const sql = `
          UPDATE perfis
          SET gerente = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
      `;
    const result = await db.query(sql, [isGerente, id]);
    return result.rows[0];
  }

  static async create(profileData) {
    const { nome, gerente, ch_primeira, ch_segunda, setor_id, usuario_id } =
      profileData;
    const sql = `
      INSERT INTO perfis (nome, gerente, ch_primeira, ch_segunda, setor_id, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await db.query(sql, [
      nome,
      gerente,
      ch_primeira,
      ch_segunda,
      setor_id,
      usuario_id,
    ]);
    return result.rows[0];
  }

  // Funções para a página de perfil do funcionário
  static async getProfileStats(id) {
    const stats = await db.get(
      `
      SELECT 
        COUNT(*) as total_movimentacoes,
        COUNT(CASE WHEN s.analise = TRUE THEN 1 END) as total_analise
      FROM movimentacoes m
      JOIN status s ON m.status_id = s.id
      WHERE m.colaborador_id = $1
    `,
      [id]
    );
    return stats || { total_movimentacoes: 0, total_analise: 0 };
  }

  // Calcula horas positivas, negativas e saldo total
  static async calculateHourBalance(profileId) {
    const movements = await db.all(
      `
      SELECT m.hora_total, m.entrada
      FROM movimentacoes m
      JOIN status s ON m.status_id = s.id
      WHERE m.colaborador_id = $1 AND s.autorizado = TRUE
    `,
      [profileId]
    );

    let positiveMinutes = 0;
    let negativeMinutes = 0;

     movements.forEach(mov => {
      if (!mov.hora_total || typeof mov.hora_total !== 'string') return;
      const [hours, minutes] = mov.hora_total.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return;

      const timeInMinutes = (hours * 60) + minutes;
      if (mov.entrada) {
        positiveMinutes += timeInMinutes;
      } else {
        negativeMinutes += timeInMinutes;
      }
    });

    const totalMinutes = positiveMinutes - negativeMinutes;

    const formatTime = (mins) => {
      if (isNaN(mins)) return "00:00";
      const sign = mins < 0 ? "-" : "";
      const absMins = Math.abs(mins);
      const hours = Math.floor(absMins / 60).toString().padStart(2, "0");
      const minutes = (absMins % 60).toString().padStart(2, "0");
      return `${sign}${hours}:${minutes}`;
    };

    const formatPositive = (mins) => {
      if (isNaN(mins) || mins <= 0) mins = 0;
      const hours = Math.floor(mins / 60).toString().padStart(2, "0");
      const minutes = (mins % 60).toString().padStart(2, "0");
      return `+${hours}:${minutes}`;
    };

    const formatNegative = (mins) => {
      if (isNaN(mins) || mins <= 0) mins = 0;
      const hours = Math.floor(mins / 60).toString().padStart(2, "0");
      const minutes = (mins % 60).toString().padStart(2, "0");
      return `-${hours}:${minutes}`;
    };

    return {
      total_minutes: totalMinutes,
      formatted: formatTime(totalMinutes),
      positive: formatPositive(positiveMinutes),
      negative: formatNegative(negativeMinutes),
    };
  }
}

module.exports = Profile;
