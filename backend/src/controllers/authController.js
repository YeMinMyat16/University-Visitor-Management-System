const Guard = require('../models/guard');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const guard = await Guard.findByUsername(username);

    if (!guard || !(await bcrypt.compare(password, guard.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: guard.id, role: guard.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await Guard.updateLastLogin(guard.id);

    res.json({
      token,
      user: {
        id: guard.id,
        username: guard.username,
        full_name: guard.full_name,
        role: guard.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || String(error), stack: error.stack });
  }
};

exports.register = async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    const guardId = await Guard.create({ username, password, full_name, role });
    res.status(201).json({ message: 'Guard registered', id: guardId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
