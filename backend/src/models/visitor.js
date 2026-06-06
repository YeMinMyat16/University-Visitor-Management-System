const db = require('../config/db');

class Visitor {
  static async create(data) {
    const { full_name, id_number, contact_number, vehicle_plate, image_base64 } = data;
    const [result] = await db.query(
      'INSERT INTO visitors (full_name, id_number, contact_number, vehicle_plate, image_base64) VALUES (?, ?, ?, ?, ?)',
      [full_name, id_number, contact_number, vehicle_plate, image_base64]
    );
    return result.insertId;
  }

  static async findByIdNumber(idNumber) {
    const [rows] = await db.query('SELECT * FROM visitors WHERE id_number = ?', [idNumber]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM visitors WHERE id = ?', [id]);
    return rows[0];
  }

  static async update(id, data) {
    const { full_name, contact_number, vehicle_plate, image_base64 } = data;
    await db.query(
      'UPDATE visitors SET full_name = ?, contact_number = ?, vehicle_plate = ?, image_base64 = ? WHERE id = ?',
      [full_name, contact_number, vehicle_plate, image_base64, id]
    );
  }
}

module.exports = Visitor;
