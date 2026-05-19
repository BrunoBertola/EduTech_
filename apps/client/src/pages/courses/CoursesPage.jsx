import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Button from '../../components/Button';
import CursoCard from '../../components/CursoCard';
import './CoursesPage.css';

export default function CoursesPage({ user }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const isAdmin = user.role === 'administrador';
  const isProfessor = user.role === 'profesor';
  const canCreateCourse = isProfessor || isAdmin;

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/courses');
        setCourses(res.data);
      } catch (err) {
        setError('Error al cargar los cursos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayedCourses = useMemo(() => {
    const coursesToShow = isAdmin && ownerFilter === 'mine'
      ? courses.filter(course => course.created_by === user.id)
      : courses;

    return coursesToShow.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || course.instructor === category;
      return matchesSearch && matchesCategory;
    });
  }, [courses, search, category, isAdmin, ownerFilter, user.id]);

  const categories = useMemo(() => {
    const coursesToFilter = isAdmin && ownerFilter === 'mine'
      ? courses.filter(course => course.created_by === user.id)
      : courses;
    const instructors = [...new Set(coursesToFilter.map(c => c.instructor).filter(Boolean))];
    return instructors;
  }, [courses, isAdmin, ownerFilter, user.id]);

  return (
    <main className="courses-page">
      <div className="courses-page-container">
        <div className="courses-page-toolbar">
          <h1>{canCreateCourse ? (isAdmin ? 'Gestionar cursos' : 'Mis cursos') : 'Cursos'}</h1>
          <div className="courses-toolbar-right">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="courses-search"
            />
            {categories.length > 1 && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="courses-select"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
            {isAdmin && (
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="courses-select"
              >
                <option value="all">Todos los cursos</option>
                <option value="mine">Mis cursos</option>
              </select>
            )}
            {canCreateCourse && (
              <Button to="/courses/create">Crear</Button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <div className="courses-loading">Cargando cursos...</div>
        ) : displayedCourses.length === 0 ? (
          <div className="courses-empty">
            No hay cursos disponibles.
          </div>
        ) : (
          <div className="courses-grid">
            {displayedCourses.map((course) => (
              <CursoCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

