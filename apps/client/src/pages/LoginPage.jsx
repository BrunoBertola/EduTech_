import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap } from 'lucide-react';
import './LoginPage.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const initialForm = {
  mode: 'register',
  role: 'alumno',
  name: '',
  email: '',
  password: ''
};

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(null);
  const initialMessage = searchParams.get('error') === 'google_not_configured'
    ? 'Google OAuth no esta configurado. Usa cuenta normal o acceso demo.'
    : '';
  const [message, setMessage] = useState(initialMessage);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const loginDemo = async (role) => {
    const demoPasswords = {
      administrador: 'Admin123!',
      profesor: 'Profesor123!',
      alumno: 'Alumno123!',
    };

    setLoading(`demo-${role}`);
    setMessage('');

    try {
      await axios.post('/auth/demo-login', { role, password: demoPasswords[role] });
      window.location.href = '/';
    } catch (err) {
      setMessage(err.response?.data?.message || 'No se pudo iniciar la sesion demo');
      setLoading(null);
    }
  };

  const handleLocalSubmit = async (ev) => {
    ev.preventDefault();
    setLoading('local');
    setMessage('');

    try {
      const endpoint = form.mode === 'register' ? '/auth/local/register' : '/auth/local/login';
      const payload = form.mode === 'register'
        ? { name: form.name, email: form.email, password: form.password, role: form.role }
        : { email: form.email, password: form.password };

      await axios.post(endpoint, payload);
      window.location.href = '/';
    } catch (err) {
      setMessage(err.response?.data?.message || 'No se pudo completar el acceso');
      setLoading(null);
    }
  };

  return (
    <div className="login-root">
      <div className="login-panel login-panel--left">
        <div className="login-brand">
          <GraduationCap size={26} className="login-brand-icon" />
          <span>EduTech</span>
        </div>

        <div className="login-claim">
          <h1>
            El conocimiento<br />
            es el unico activo<br />
            que nadie te<br />
            puede quitar.
          </h1>
          <p>
            Aprende a tu ritmo con cursos impartidos
            por profesores expertos y mide tu progreso
            con tests interactivos.
          </p>
        </div>

        <p className="login-panel-footer">(c) {new Date().getFullYear()} EduTech</p>
      </div>

      <div className="login-panel login-panel--right">
        <div className="login-form">
          <div className="login-mobile-brand">
            <GraduationCap size={24} className="login-brand-icon" />
            <span>EduTech</span>
          </div>

          <div className="login-form-header">
            <h2>Iniciar sesion o crear cuenta</h2>
            <p>Accede con Google o crea una cuenta con email</p>
          </div>

          <div className="login-options">
            <a href="/auth/google?role=alumno" className="login-btn login-btn--primary">
              <GoogleIcon />
              <span>Continuar como Alumno con Google</span>
            </a>

            <a href="/auth/google?role=profesor" className="login-btn login-btn--secondary">
              <GoogleIcon />
              <span>Continuar como Profesor con Google</span>
            </a>
          </div>

          <div className="login-divider">
            <span>cuenta normal</span>
          </div>

          <form className="login-local-form" onSubmit={handleLocalSubmit}>
            <div className="login-segmented" aria-label="Modo de acceso">
              <button
                type="button"
                className={form.mode === 'register' ? 'active' : ''}
                onClick={() => updateForm('mode', 'register')}
              >
                Crear cuenta
              </button>
              <button
                type="button"
                className={form.mode === 'login' ? 'active' : ''}
                onClick={() => updateForm('mode', 'login')}
              >
                Entrar
              </button>
            </div>

            {form.mode === 'register' && (
              <>
                <select
                  value={form.role}
                  onChange={(e) => updateForm('role', e.target.value)}
                  className="login-input"
                >
                  <option value="alumno">Alumno</option>
                  <option value="profesor">Profesor</option>
                </select>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  className="login-input"
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              className="login-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => updateForm('password', e.target.value)}
              className="login-input"
            />

            <button type="submit" className="login-local-submit" disabled={loading !== null}>
              {loading === 'local'
                ? 'Procesando...'
                : form.mode === 'register'
                  ? 'Crear cuenta normal'
                  : 'Entrar con email'}
            </button>
          </form>

          <div className="login-divider login-divider--demo">
            <span>acceso demo</span>
          </div>

          <div className="login-demo-options">
            <button
              type="button"
              className="login-demo-btn login-demo-btn--admin"
              onClick={() => loginDemo('administrador')}
              disabled={loading !== null}
            >
              {loading === 'demo-administrador' ? 'Accediendo...' : 'Demo Admin'}
            </button>
            <button
              type="button"
              className="login-demo-btn"
              onClick={() => loginDemo('alumno')}
              disabled={loading !== null}
            >
              {loading === 'demo-alumno' ? 'Accediendo...' : 'Demo Alumno'}
            </button>
            <button
              type="button"
              className="login-demo-btn"
              onClick={() => loginDemo('profesor')}
              disabled={loading !== null}
            >
              {loading === 'demo-profesor' ? 'Accediendo...' : 'Demo Profesor'}
            </button>
          </div>

          {message && <p className="login-error">{message}</p>}
        </div>
      </div>
    </div>
  );
}
