const db = require('../config/db');
const bcrypt = require('bcryptjs');

class Guard {
  static async create(data) {
    const { username, password, full_name, role = 'guard' } = data;
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO guards (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [username, password_hash, full_name, role]
    );
    return result.insertId;
  }

  static async findByUsername(username) {
    const [rows] = await db.query('SELECT * FROM guards WHERE username = ?', [username]);
    return rows[0];
  }

  static async updateLastLogin(id) {
    await db.query('UPDATE guards SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }
}

module.exports = Guard;
