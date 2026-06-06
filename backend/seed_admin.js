const Guard = require('./src/models/guard');

async function createAdmin() {
  try {
    const existing = await Guard.findByUsername('admin');
    if (!existing) {
      await Guard.create({
        username: 'admin',
        password: 'password123',
        full_name: 'System Admin',
        role: 'admin'
      });
      console.log('Default admin created: admin / password123');
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    process.exit();
  }
}

createAdmin();
