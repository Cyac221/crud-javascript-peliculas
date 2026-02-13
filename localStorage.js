(function () {
  'use strict';

  // =========================
  // Constantes de localStorage
  // =========================
  const LS_USERS = 'crud_peliculas_users';
  const LS_SESSION = 'crud_peliculas_session';
  const LS_MOVIES = 'crud_peliculas_movies';

  const FALLBACK_IMG = 'https://via.placeholder.com/500x300?text=Sin+imagen';

  // =========================
  // Helpers
  // =========================
  const $ = (id) => document.getElementById(id);

  function safeJSONParse(raw, fallback) {
    try { return JSON.parse(raw) ?? fallback; } catch { return fallback; }
  }

  function read(key, fallback = []) {
    return safeJSONParse(localStorage.getItem(key), fallback);
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attachImgFallback(container) {
    if (!container) return;
    container.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', function () {
        this.onerror = null;
        this.src = FALLBACK_IMG;
      });
    });
  }

  // =========================
  // Datos iniciales (si no existen)
  // =========================
  function seedIfNeeded() {
    if (!localStorage.getItem(LS_USERS)) {
      write(LS_USERS, [
        { nombre: 'Admin', usuario: 'admin', password: 'admin123' },
        { nombre: 'Usuario', usuario: 'usuario', password: '1234' }
      ]);
    }

    if (!localStorage.getItem(LS_MOVIES)) {
      write(LS_MOVIES, [
        {
          id: uid(),
          titulo: 'Origen',
          genero: 'Ciencia Ficción',
          director: 'Christopher Nolan',
          ano: 2010,
          calificacion: 8.8,
          descripcion: 'Robo de secretos en sueños.',
          imagen: 'https://www.imdb.com/es/title/tt6751668/mediaviewer/rm3194916865/?ref_=tt_ov_i'
        },
        {
          id: uid(),
          titulo: 'Interestellar',
          genero: 'Drama',
          director: 'Bong Joon-ho',
          ano: 2019,
          calificacion: 8.6,
          descripcion: 'Una familia pobre se infiltra en otra.',
          imagen: 'https://m.media-amazon.com/images/I/91kFYg4fX3L._AC_SL1500_.jpg'
        }
      ]);
    }
  }

  // =========================
  // Storage API (mismo contrato)
  // =========================
  function getUsers() { return read(LS_USERS, []); }
  function saveUsers(users) { write(LS_USERS, users); }

  function getSession() { return safeJSONParse(localStorage.getItem(LS_SESSION), null); }
  function saveSession(session) {
    if (session) localStorage.setItem(LS_SESSION, JSON.stringify(session));
    else localStorage.removeItem(LS_SESSION);
  }

  function getMovies() { return read(LS_MOVIES, []); }
  function saveMovies(movies) { write(LS_MOVIES, movies); }

  // =========================
  // App
  // =========================
  document.addEventListener('DOMContentLoaded', function () {
    seedIfNeeded();

    // --- Elementos del DOM (IDs iguales a tu HTML) ---
    const loginSection = $('loginSection');
    const mainContent = $('mainContent');
    const btnAgregar = $('btnAgregar');
    const btnLogin = $('btnLogin');
    const btnLogout = $('btnLogout');

    const formLogin = $('formLogin');
    const formRegistro = $('formRegistro');

    const inputBuscar = $('inputBuscar');
    const selectGenero = $('selectGenero');

    const gridPeliculas = $('gridPeliculas');
    const carouselMovies = $('carouselMovies');
    const sinResultados = $('sinResultados');

    // Modales (Bootstrap)
    const modalPeliculaEl = $('modalPelicula');
    const modalDetallesEl = $('modalDetalles');
    const modalPelicula = (window.bootstrap && modalPeliculaEl) ? new bootstrap.Modal(modalPeliculaEl) : null;
    const modalDetalles = (window.bootstrap && modalDetallesEl) ? new bootstrap.Modal(modalDetallesEl) : null;

    const formPelicula = $('formPelicula');
    const btnGuardarPelicula = $('btnGuardarPelicula');

    // Detalles
    const detallesTitulo = $('detallesTitulo');
    const detallesImagen = $('detallesImagen');
    const detallesGenero = $('detallesGenero');
    const detallesDirector = $('detallesDirector');
    const detallesAno = $('detallesAno');
    const detallesCalificacion = $('detallesCalificacion');
    const detallesDescripcion = $('detallesDescripcion');

    let editingId = null;

    // =========================
    // UI según sesión
    // =========================
    function updateUIForSession() {
      const s = getSession();
      const logged = !!s;

      if (loginSection) loginSection.style.display = logged ? 'none' : '';
      if (mainContent) mainContent.style.display = logged ? '' : 'none';

      if (btnAgregar) btnAgregar.style.display = logged ? '' : 'none';
      if (btnLogout) btnLogout.style.display = logged ? '' : 'none';
      if (btnLogin) btnLogin.style.display = logged ? 'none' : '';
    }

    // =========================
    // Auth
    // =========================
    if (formLogin) {
      formLogin.addEventListener('submit', function (e) {
        e.preventDefault();

        const usuario = ($('inputUser')?.value || '').trim();
        const password = $('inputPassword')?.value || '';

        const user = getUsers().find((u) => u.usuario === usuario && u.password === password);

        if (user) {
          saveSession({ usuario: user.usuario, nombre: user.nombre });
          updateUIForSession();
          renderAll();
        } else {
          alert('Usuario o contraseña incorrectos');
        }
      });
    }

    if (formRegistro) {
      formRegistro.addEventListener('submit', function (e) {
        e.preventDefault();

        const nombre = ($('inputNombre')?.value || '').trim();
        const email = ($('inputEmail')?.value || '').trim();
        const usuario = ($('inputUserReg')?.value || '').trim();
        const password = $('inputPasswordReg')?.value || '';
        const confirm = $('inputConfirmPassword')?.value || '';

        if (usuario.length < 4) return alert('Usuario mínimo 4 caracteres');
        if (password.length < 6) return alert('Contraseña mínimo 6 caracteres');
        if (password !== confirm) return alert('Las contraseñas no coinciden');

        const users = getUsers();
        if (users.some((u) => u.usuario === usuario)) return alert('Usuario ya existe');

        users.push({ nombre, email, usuario, password });
        saveUsers(users);

        alert('Cuenta creada. Inicia sesión.');
        formRegistro.reset();
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', function () {
        saveSession(null);
        updateUIForSession();
      });
    }

    if (btnLogin) {
      btnLogin.addEventListener('click', function () {
        if (loginSection) loginSection.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // =========================
    // CRUD Películas
    // =========================
    function openAddModal() {
      editingId = null;
      const titleEl = $('modalTitulo');
      if (titleEl) titleEl.textContent = 'Agregar Película';
      if (formPelicula) formPelicula.reset();
      if (modalPelicula) modalPelicula.show();
    }

    function openEditModal(id) {
      const movie = getMovies().find((x) => x.id === id);
      if (!movie) return alert('Película no encontrada');

      editingId = id;
      const titleEl = $('modalTitulo');
      if (titleEl) titleEl.textContent = 'Editar Película';

      $('inputTitulo').value = movie.titulo;
      $('inputGenero').value = movie.genero;
      $('inputDirector').value = movie.director;
      $('inputAno').value = movie.ano;
      $('inputCalificacion').value = movie.calificacion;
      $('inputDescripcion').value = movie.descripcion;
      $('inputImagen').value = movie.imagen;

      if (modalPelicula) modalPelicula.show();
    }

    function deleteMovie(id) {
      if (!confirm('¿Eliminar esta película?')) return;
      saveMovies(getMovies().filter((m) => m.id !== id));
      renderAll();
    }

    function viewDetails(id) {
      const movie = getMovies().find((m) => m.id === id);
      if (!movie) return;

      if (detallesTitulo) detallesTitulo.textContent = movie.titulo;

      if (detallesImagen) {
        detallesImagen.onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };
        detallesImagen.src = movie.imagen || FALLBACK_IMG;
      }

      if (detallesGenero) detallesGenero.textContent = movie.genero;
      if (detallesDirector) detallesDirector.textContent = movie.director;
      if (detallesAno) detallesAno.textContent = movie.ano;
      if (detallesCalificacion) detallesCalificacion.textContent = movie.calificacion;
      if (detallesDescripcion) detallesDescripcion.textContent = movie.descripcion;

      if (modalDetalles) modalDetalles.show();
    }

    if (btnGuardarPelicula) {
      btnGuardarPelicula.addEventListener('click', function () {
        const titulo = ($('inputTitulo')?.value || '').trim();
        const genero = $('inputGenero')?.value || '';
        const director = ($('inputDirector')?.value || '').trim();
        const ano = parseInt($('inputAno')?.value, 10);
        const calificacion = parseFloat($('inputCalificacion')?.value);
        const descripcion = ($('inputDescripcion')?.value || '').trim();
        const imagen = ($('inputImagen')?.value || '').trim();

        if (!titulo || !genero || !director || !ano || !calificacion || !descripcion) {
          return alert('Completa todos los campos');
        }

        const movies = getMovies();

        if (editingId) {
          const i = movies.findIndex((m) => m.id === editingId);
          if (i === -1) return alert('Error al editar');

          movies[i] = { id: editingId, titulo, genero, director, ano, calificacion, descripcion, imagen };
          saveMovies(movies);
          alert('Película actualizada');
        } else {
          movies.push({ id: uid(), titulo, genero, director, ano, calificacion, descripcion, imagen });
          saveMovies(movies);
          alert('Película agregada');
        }

        if (modalPelicula) modalPelicula.hide();
        if (formPelicula) formPelicula.reset();
        renderAll();
      });
    }

    if (btnAgregar) btnAgregar.addEventListener('click', openAddModal);

    // =========================
    // Delegación de eventos (grid / carrusel)
    // =========================
    if (gridPeliculas) {
      gridPeliculas.addEventListener('click', function (e) {
        const card = e.target.closest('[data-id]');
        if (!card) return;

        const id = parseInt(card.getAttribute('data-id'), 10);

        if (e.target.classList.contains('btn-view')) viewDetails(id);
        if (e.target.classList.contains('btn-edit')) openEditModal(id);
        if (e.target.classList.contains('btn-delete')) deleteMovie(id);
      });
    }

    if (carouselMovies) {
      carouselMovies.addEventListener('click', function (e) {
        const card = e.target.closest('[data-id]');
        if (!card) return;
        viewDetails(parseInt(card.getAttribute('data-id'), 10));
      });
    }

    // =========================
    // Render
    // =========================
    function matches(m, search, genero) {
      const q = (search || '').toLowerCase().trim();
      const okGenero = (!genero || m.genero === genero);
      const okSearch =
        (!q ||
          m.titulo.toLowerCase().includes(q) ||
          m.descripcion.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q));
      return okGenero && okSearch;
    }

    function renderGrid() {
      if (!gridPeliculas) return;

      const movies = getMovies().filter((m) => matches(m, inputBuscar?.value, selectGenero?.value));
      gridPeliculas.innerHTML = '';

      if (sinResultados) sinResultados.style.display = (movies.length === 0) ? '' : 'none';
      if (movies.length === 0) return;

      const frag = document.createDocumentFragment();

      movies.forEach((m) => {
        const col = document.createElement('div');
        col.className = 'col-sm-6 col-md-4 col-lg-3';

        const imgSrc = m.imagen || FALLBACK_IMG;

        col.innerHTML =
          '<div class="movie-card" data-id="' + m.id + '">' +
            '<img src="' + imgSrc + '" class="movie-image" alt="' + escapeHtml(m.titulo) + '">' +
            '<div class="movie-content">' +
              '<div class="movie-genre">' + escapeHtml(m.genero) + '</div>' +
              '<div class="movie-title">' + escapeHtml(m.titulo) + '</div>' +
              '<div class="movie-meta">' + escapeHtml(m.director) + ' • ' + m.ano + '</div>' +
              '<div class="movie-rating">' + m.calificacion + ' ⭐</div>' +
              '<div class="movie-description">' + escapeHtml(m.descripcion) + '</div>' +
              '<div class="movie-actions mt-2">' +
                '<button class="btn btn-sm btn-info btn-view">Ver</button> ' +
                '<button class="btn btn-sm btn-warning btn-edit">Editar</button> ' +
                '<button class="btn btn-sm btn-danger btn-delete">Eliminar</button>' +
              '</div>' +
            '</div>' +
          '</div>';

        frag.appendChild(col);
      });

      gridPeliculas.appendChild(frag);
      attachImgFallback(gridPeliculas);
    }

    function renderCarousel() {
      if (!carouselMovies) return;

      const recent = [...getMovies()].sort((a, b) => b.id - a.id).slice(0, 12);
      carouselMovies.innerHTML = '';

      const frag = document.createDocumentFragment();

      recent.forEach((m) => {
        const card = document.createElement('div');
        card.className = 'slider-movie-card';
        card.setAttribute('data-id', m.id);

        const imgSrc = m.imagen || FALLBACK_IMG;

        card.innerHTML =
          '<img src="' + imgSrc + '" alt="' + escapeHtml(m.titulo) + '">' +
          '<div class="slider-movie-info">' +
            '<h6>' + escapeHtml(m.titulo) + '</h6>' +
            '<small class="text-muted">' + escapeHtml(m.genero) + '</small>' +
          '</div>';

        frag.appendChild(card);
      });

      carouselMovies.appendChild(frag);
      attachImgFallback(carouselMovies);
    }

    function renderAll() {
      renderGrid();
      renderCarousel();
    }

    // Buscador y filtros
    if (inputBuscar) inputBuscar.addEventListener('input', renderGrid);
    if (selectGenero) selectGenero.addEventListener('change', renderGrid);

    // Slider control desde HTML (mantengo tu API pública)
    window.scrollSlider = function (dir) {
      const el = $('carouselMovies');
      if (!el) return;
      el.scrollBy({ left: el.clientWidth * 0.6 * dir, behavior: 'smooth' });
    };

    // Export simple para debugging (mantengo tu API pública)
    window.__crud = { getMovies, saveMovies, getUsers, saveUsers, getSession, saveSession, renderAll };

    // Inicialización visual
    updateUIForSession();
    renderAll();
  });
})();
