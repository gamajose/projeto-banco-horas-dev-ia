// Ficheiro: src/models/Escala.js

const db = require("../config/database");

class Escala {

    /**
     * Busca todas as entradas de escala para um determinado mês e ano.
     * @param {number} ano - O ano.
     * @param {number} mes - O mês (1-12).
     * @returns {Promise<Array>}
     */
    static async findByMonth(ano, mes) {
        // Garante que o mês tem dois dígitos para a consulta SQL (ex: '09' para Setembro)
        const mesFormatado = mes.toString().padStart(2, '0');
        const sql = `
            SELECT 
                id, 
                perfil_id, 
                data, 
                tipo_escala, 
                TO_CHAR(hora_inicio, 'HH24:MI') as hora_inicio, 
                TO_CHAR(hora_fim, 'HH24:MI') as hora_fim, 
                observacoes 
            FROM escalas 
            WHERE EXTRACT(YEAR FROM data) = $1 AND EXTRACT(MONTH FROM data) = $2
        `;
        return await db.all(sql, [ano, mes]);
    }

    /**
     * Cria ou atualiza uma entrada de escala (Upsert).
     * Se já existir uma escala para o colaborador e data, atualiza. Se não, cria uma nova.
     * @param {object} data - Os dados da escala.
     * @returns {Promise<object>}
     */

    /**
     * Encontra uma única entrada de escala para um perfil e data específicos.
     * @param {number} perfil_id - O ID do perfil do colaborador.
     * @param {string} data - A data no formato 'YYYY-MM-DD'.
     * @returns {Promise<object|null>}
     */
    static async findForDate(perfil_id, data) {
        const sql = `
            SELECT 
                tipo_escala, 
                TO_CHAR(hora_inicio, 'HH24:MI') as hora_inicio, 
                TO_CHAR(hora_fim, 'HH24:MI') as hora_fim
            FROM escalas 
            WHERE perfil_id = $1 AND data = $2
            LIMIT 1;
        `;
        const result = await db.get(sql, [perfil_id, data]);
        return result;
    }
    static async upsert(data) {
        const { perfil_id, data: dia, tipo_escala, hora_inicio, hora_fim, observacoes } = data;
        const sql = `
            INSERT INTO escalas (perfil_id, data, tipo_escala, hora_inicio, hora_fim, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (perfil_id, data) 
            DO UPDATE SET 
                tipo_escala = EXCLUDED.tipo_escala,
                hora_inicio = EXCLUDED.hora_inicio,
                hora_fim = EXCLUDED.hora_fim,
                observacoes = EXCLUDED.observacoes,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        // Garante que horários sejam nulos se não forem fornecidos
        const params = [perfil_id, dia, tipo_escala, hora_inicio || null, hora_fim || null, observacoes || null];
        const result = await db.get(sql, params);
        return result;
    }

    /**
     * Remove uma entrada de escala.
     * @param {number} perfil_id - O ID do perfil do colaborador.
     * @param {string} data - A data da escala a ser removida (YYYY-MM-DD).
     * @returns {Promise<boolean>}
     */
    static async delete(perfil_id, data) {
        const sql = `DELETE FROM escalas WHERE perfil_id = $1 AND data = $2`;
        const result = await db.run(sql, [perfil_id, data]);
        return result.rowCount > 0;
    }

    /**
     * Busca todas as entradas de escala para um colaborador específico em um determinado mês e ano.
     * @param {number} perfil_id - O ID do perfil do colaborador.
     * @param {number} ano - O ano.
     * @param {number} mes - O mês (1-12).
     * @returns {Promise<Array>}
     */
    static async findByProfileAndMonth(perfil_id, ano, mes) {
        const mesFormatado = mes.toString().padStart(2, '0');
        const sql = `
            SELECT 
                id, 
                perfil_id, 
                data, 
                tipo_escala, 
                TO_CHAR(hora_inicio, 'HH24:MI') as hora_inicio, 
                TO_CHAR(hora_fim, 'HH24:MI') as hora_fim, 
                observacoes 
            FROM escalas 
            WHERE perfil_id = $1
              AND EXTRACT(YEAR FROM data) = $2 
              AND EXTRACT(MONTH FROM data) = $3
        `;
        return await db.all(sql, [perfil_id, ano, mes]);
    }
}

module.exports = Escala;