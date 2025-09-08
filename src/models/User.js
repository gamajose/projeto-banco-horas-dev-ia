const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');

class User {
  // Métodos estáticos
  static async findById(id) {
    const sql = `SELECT * FROM usuarios WHERE id = $1`;
    return await db.get(sql, [id]);
  }

  static async findByLogin(login) {
        const sql = `SELECT * FROM usuarios WHERE email = $1 OR username = $1`;
        const user = await db.get(sql, [login]);
        
        // Se encontrarmos um utilizador, adicionamos dinamicamente o método 
        // para comparar a senha a esse objeto específico.
        if (user) {
            user.comparePassword = async function(candidatePassword) {
                // Compara a senha fornecida com a senha "hasheada" no banco de dados
                return bcrypt.compare(candidatePassword, this.password_hash);
            };
        }
        return user;
    }

  static async findAll() {
    const sql = `SELECT * FROM usuarios ORDER BY first_name`;
    return await db.all(sql);
  }

  static async create(userData) {
    const { username, email, password, first_name, last_name, is_staff } = userData;
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const sql = `
      INSERT INTO usuarios (username, email, password_hash, first_name, last_name, is_staff, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await db.run(sql, [username, email, password_hash, first_name, last_name, is_staff || false]);
    return result.rows[0];
  }

 static async update(id, userData) {
    const { username, email, password, first_name, last_name } = userData;
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (username) { fields.push(`username = $${paramIndex++}`); params.push(username); }
    if (email) { fields.push(`email = $${paramIndex++}`); params.push(email); }
    if (first_name) { fields.push(`first_name = $${paramIndex++}`); params.push(first_name); }
    if (last_name) { fields.push(`last_name = $${paramIndex++}`); params.push(last_name); }
    
    if (password) {
      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);
      fields.push(`password_hash = $${paramIndex++}`);
      params.push(password_hash);
      // Se a senha for alterada por um admin, o usuário não precisa de a alterar no próximo login.
      fields.push(`force_password_change = $${paramIndex++}`);
      params.push(false);
    }
    
    if (fields.length === 0) return; // Nenhum campo para atualizar

    params.push(id);
    const sql = `UPDATE usuarios SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(sql, params);
    return result.rows[0];
  }


static async findByEmail(email) {
        const sql = `SELECT * FROM usuarios WHERE email = $1`;
        return await db.get(sql, [email]);
    }

    // NOVO MÉTODO: Gerar e salvar o token de redefinição
    static async generatePasswordResetToken(userId) {
        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); // Token válido por 1 hora

        const sql = `
            UPDATE usuarios 
            SET reset_password_token = $1, reset_password_expires = $2 
            WHERE id = $3 
            RETURNING reset_password_token
        `;
        const result = await db.query(sql, [token, expires, userId]);
        return result.rows[0].reset_password_token;
    }
}




module.exports = User;
