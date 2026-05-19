const crypto = require('crypto');

function resolveClient(req) {
  const rawHost  = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const rawProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host  = rawHost.split(',')[0].trim();
  const proto = host.includes('ngrok') ? 'https' : rawProto.split(',')[0].trim();
  if (host && !host.startsWith('localhost') && !host.startsWith('127.')) {
    return `${proto}://${host}`;
  }
  return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
}

function logout(req, res) {
  const clientUrl = resolveClient(req);
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect(clientUrl);
    });
  });
}

function authCallback(req, res) {
  const clientUrl = resolveClient(req);
  res.redirect(clientUrl);
}

function authFailure(req, res) {
  const clientUrl = resolveClient(req);
  res.redirect(`${clientUrl}?error=auth_failed`);
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [method, salt, hash] = storedHash.split(':');
  if (method !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const demoUsers = {
  administrador: {
    email: 'admin@tfgdemo.com',
    password: 'Admin123!'
  },
  profesor: {
    email: 'profesor@tfgdemo.com',
    password: 'Profesor123!'
  },
  alumno: {
    email: 'alumno@tfgdemo.com',
    password: 'Alumno123!'
  }
};

async function demoLogin(req, res, next) {
  const { role, password } = req.body;
  const demoUser = demoUsers[role];

  if (!demoUser || demoUser.password !== password) {
    return res.status(401).json({ message: 'Credenciales incorrectas' });
  }

  try {
    const { findByEmail } = require('../services/user.service');
    const user = await findByEmail(demoUser.email);

    if (!user) {
      return res.status(404).json({ message: 'Usuario demo no encontrado en la base de datos' });
    }

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ ok: true, user: publicUser(user) });
    });
  } catch (err) {
    next(err);
  }
}

async function localRegister(req, res, next) {
  const { name, email, password, role } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  const cleanRole = role === 'profesor' ? 'profesor' : 'alumno';

  if (!cleanName || !cleanEmail || !password) {
    return res.status(400).json({ message: 'Nombre, email y password son obligatorios' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'El password debe tener al menos 8 caracteres' });
  }

  try {
    const { findByEmail, createLocalUser } = require('../services/user.service');
    const existing = await findByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ message: 'Ya existe una cuenta con ese email' });
    }

    const user = await createLocalUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      role: cleanRole
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ ok: true, user: publicUser(user) });
    });
  } catch (err) {
    next(err);
  }
}

async function localLogin(req, res, next) {
  const { email, password } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ message: 'Email y password son obligatorios' });
  }

  try {
    const { findByEmail } = require('../services/user.service');
    const user = await findByEmail(cleanEmail);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ ok: true, user: publicUser(user) });
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  logout,
  authCallback,
  authFailure,
  demoLogin,
  localRegister,
  localLogin
};
