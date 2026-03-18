const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

function signToken(adminId) {
  return jwt.sign(
    { sub: adminId, role: 'admin' },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    const passwordHash = await Admin.hashPassword(password);
    const admin = await Admin.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name || 'Admin',
    });
    const token = signToken(admin._id.toString());
    return res.status(201).json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(admin._id.toString());
    return res.json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function me(req, res) {
  try {
    const admin = await Admin.findById(req.adminId).select('-passwordHash');
    if (!admin) return res.status(404).json({ message: 'Not found' });
    return res.json({ admin });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { register, login, me };
