const db = require('../config/db');

class Visit {
  static async create(data) {
    const { visitor_id, person_to_meet, reason, status = 'pending' } = data;
    const [result] = await db.query(
      'INSERT INTO visits (visitor_id, person_to_meet, reason, status) VALUES (?, ?, ?, ?)',
      [visitor_id, person_to_meet, reason, status]
    );
    return result.insertId;
  }

  static async findAllPending() {
    const [rows] = await db.query(`
      SELECT v.*, vis.full_name, vis.id_number, vis.contact_number, vis.vehicle_plate, vis.image_base64 
      FROM visits v 
      JOIN visitors vis ON v.visitor_id = vis.id 
      WHERE v.status = 'pending'
    `);
    return rows;
  }

  static async findAllActive() {
    const [rows] = await db.query(`
      SELECT v.*, vis.full_name, vis.id_number, vis.contact_number, vis.vehicle_plate, vis.image_base64 
      FROM visits v 
      JOIN visitors vis ON v.visitor_id = vis.id 
      WHERE v.status IN ('inside', 'request_checkout')
    `);
    return rows;
  }

  static async findAllCheckoutRequests() {
    const [rows] = await db.query(`
      SELECT v.*, vis.full_name, vis.id_number, vis.contact_number, vis.vehicle_plate, vis.image_base64 
      FROM visits v 
      JOIN visitors vis ON v.visitor_id = vis.id 
      WHERE v.status = 'request_checkout'
    `);
    return rows;
  }

  static async updateStatus(id, status, timeField = null, reason = null) {
    let query = 'UPDATE visits SET status = ?';
    let params = [status];
    if (timeField) {
      query += `, ${timeField} = CURRENT_TIMESTAMP`;
    }
    if (reason) {
      query += `, rejection_reason = ?`;
      params.push(reason);
    }
    query += ' WHERE id = ?';
    params.push(id);
    await db.query(query, params);
  }

  static async findHistory() {
    const [rows] = await db.query(`
      SELECT v.*, vis.full_name, vis.id_number, vis.contact_number, vis.vehicle_plate, vis.image_base64 
      FROM visits v 
      JOIN visitors vis ON v.visitor_id = vis.id 
      ORDER BY v.created_at DESC
    `);
    return rows;
  }

  static async deleteAll() {
    await db.query('DELETE FROM visits');
    await db.query('DELETE FROM visitors');
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM visits WHERE id = ?', [id]);
    return rows[0];
  }
}

module.exports = Visit;
