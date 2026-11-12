/* ============================================================
   DASHBOARD ADMIN — accesso Google e gestione recensioni
   ============================================================ */
(function () {
  'use strict';

  var $ = function (selector, scope) {
    return (scope || document).querySelector(selector);
  };
  var $$ = function (selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  };

  var gate = $('#adminGate');
  var app = $('#adminApp');
  var gateStatus = $('#gateStatus');
  var loginBtn = $('#googleLogin');
  var logoutBtn = $('#logoutBtn');

  var form = $('#reviewForm');
  var nameInput = $('#reviewName');
  var initialInput = $('#reviewInitial');
  var textInput = $('#reviewText');
  var submitLabel = $('#reviewSubmitLabel');
  var cancelBtn = $('#reviewCancel');
  var formStatus = $('#formStatus');

  var starsField = $('#starsField');
  var searchInput = $('#reviewSearch');
  var listEl = $('#reviewsList');
  var countEl = $('#reviewCount');
  var toastEl = $('#adminToast');

  var modal = $('#confirmModal');

  var reviews = [];
  var filterText = '';
  var editingId = null;
  var pendingDeleteId = null;
  var rating = 5;
  var unsubscribe = null;
  var toastTimer = null;

  /* ---------------- utilità ---------------- */

  function toast(message, type) {
    toastEl.textContent = message;
    toastEl.className = 'admin-toast is-visible' + (type ? ' is-' + type : '');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.className = 'admin-toast';
    }, 4200);
  }

  function setFormStatus(message, type) {
    formStatus.textContent = message || '';
    formStatus.className = 'admin-form-status' + (type ? ' is-' + type : '');
  }

  function formatError(error) {
    var code = error && error.code ? String(error.code) : '';
    if (code.indexOf('permission-denied') !== -1) {
      return 'Permessi insufficienti: controlla le regole Firestore e l’email admin.';
    }
    if (code.indexOf('unavailable') !== -1) {
      return 'Connessione a Firebase non disponibile. Riprova tra poco.';
    }
    if (code.indexOf('unauthenticated') !== -1) {
      return 'Sessione scaduta: accedi di nuovo.';
    }
    return (error && error.message) || 'Si è verificato un errore. Riprova.';
  }

  /* ---------------- stelle ---------------- */

  function paintStars(value) {
    rating = value;
    $$('.admin-star', starsField).forEach(function (star) {
      var active = Number(star.dataset.value) <= value;
      star.classList.toggle('is-on', active);
      star.setAttribute('aria-checked', String(Number(star.dataset.value) === value));
    });
  }

  starsField.addEventListener('click', function (event) {
    var star = event.target.closest('.admin-star');
    if (!star) return;
    paintStars(Number(star.dataset.value));
  });

  /* ---------------- accesso ---------------- */

  function showGate(message, isError) {
    gate.hidden = false;
    app.hidden = true;
    gateStatus.textContent = message || '';
    gateStatus.className = 'admin-gate-status' + (isError ? ' is-error' : '');
  }

  function showApp(user) {
    gate.hidden = true;
    app.hidden = false;

    var mail = user && user.email ? user.email : '—';
    $('#userEmail').textContent = mail;
    $('#userAvatar').textContent = (mail.charAt(0) || 'A').toUpperCase();
  }

  loginBtn.addEventListener('click', function () {
    if (!window.SiteFirebase.isConfigured()) return;

    loginBtn.disabled = true;
    gateStatus.textContent = 'Apertura della finestra di accesso Google…';
    gateStatus.className = 'admin-gate-status';

    window.SiteFirebase.signInWithGoogle()
      .catch(function (error) {
        if (error && error.code === 'auth/popup-closed-by-user') {
          gateStatus.textContent = 'Accesso annullato.';
        } else {
          gateStatus.textContent = formatError(error);
          gateStatus.className = 'admin-gate-status is-error';
        }
      })
      .then(function () { loginBtn.disabled = false; });
  });

  logoutBtn.addEventListener('click', function () {
    window.SiteFirebase.signOutUser();
  });

  /* ---------------- menu laterale ---------------- */

  $$('.admin-nav-item').forEach(function (button) {
    button.addEventListener('click', function () {
      $$('.admin-nav-item').forEach(function (item) {
        var active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-current', active ? 'true' : 'false');
      });

      $$('.admin-panel').forEach(function (panel) {
        panel.classList.toggle('is-active', panel.id === 'panel-' + button.dataset.panel);
      });
    });
  });

  /* ---------------- lista ---------------- */

  function matches(review) {
    if (!filterText) return true;
    var haystack = (review.name + ' ' + review.initial + ' ' + review.text).toLowerCase();
    return haystack.indexOf(filterText) !== -1;
  }

  function starRow(value) {
    var wrap = document.createElement('div');
    wrap.className = 'admin-item-stars';
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', value + ' stelle su 5');
    for (var i = 0; i < 5; i++) {
      var icon = document.createElement('i');
      icon.className = 'bx ' + (i < value ? 'bxs-star' : 'bx-star');
      icon.setAttribute('aria-hidden', 'true');
      wrap.appendChild(icon);
    }
    return wrap;
  }

  function deleteButton() {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-delete';
    button.setAttribute('aria-label', 'Elimina recensione');
    button.innerHTML = '<svg viewBox="0 0 448 512" class="svgIcon" aria-hidden="true">'
      + '<path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32S433.7 32 416 32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>'
      + '</svg>';
    return button;
  }

  function renderList() {
    listEl.innerHTML = '';

    var visible = reviews.filter(matches);
    countEl.textContent = reviews.length
      ? visible.length + ' di ' + reviews.length
      : '';

    if (!visible.length) {
      var empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = reviews.length
        ? 'Nessuna recensione corrisponde alla ricerca.'
        : 'Nessuna recensione presente: usane una con il formulario qui sopra.';
      listEl.appendChild(empty);
      return;
    }

    visible.forEach(function (review) {
      var item = document.createElement('article');
      item.className = 'admin-item';

      var avatar = document.createElement('span');
      avatar.className = 'admin-item-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = (review.name.charAt(0) || '?').toUpperCase();

      var body = document.createElement('div');
      body.className = 'admin-item-body';

      var head = document.createElement('div');
      head.className = 'admin-item-head';

      var name = document.createElement('strong');
      name.textContent = review.name + ' ' + review.initial + '.';

      head.appendChild(name);
      head.appendChild(starRow(review.stars));

      var text = document.createElement('p');
      text.className = 'admin-item-text';
      text.textContent = review.text;

      body.appendChild(head);
      body.appendChild(text);

      var actions = document.createElement('div');
      actions.className = 'admin-item-actions';

      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'admin-edit';
      edit.setAttribute('aria-label', 'Modifica recensione');
      edit.innerHTML = '<i class="bx bx-edit-alt" aria-hidden="true"></i><span>Modifica</span>';
      edit.addEventListener('click', function () { startEdit(review); });

      var remove = deleteButton();
      remove.addEventListener('click', function () { askDelete(review); });

      actions.appendChild(edit);
      actions.appendChild(remove);

      item.appendChild(avatar);
      item.appendChild(body);
      item.appendChild(actions);

      listEl.appendChild(item);
    });
  }

  /* ---------------- form ---------------- */

  function resetForm() {
    editingId = null;
    form.reset();
    paintStars(5);
    submitLabel.textContent = 'Salva recensione';
    cancelBtn.hidden = true;
    setFormStatus('');
  }

  function startEdit(review) {
    editingId = review.id;
    nameInput.value = review.name;
    initialInput.value = review.initial;
    textInput.value = review.text;
    paintStars(review.stars);
    submitLabel.textContent = 'Salva modifiche';
    cancelBtn.hidden = false;
    setFormStatus('Stai modificando la recensione di ' + review.name + '.', 'info');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nameInput.focus();
  }

  cancelBtn.addEventListener('click', resetForm);

  initialInput.addEventListener('input', function () {
    var value = initialInput.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
    initialInput.value = value;
  });

  function readForm() {
    var name = nameInput.value.trim();
    var initial = initialInput.value.trim().toUpperCase();
    var text = textInput.value.trim();

    if (name.length < 1) return { error: 'Inserisci il nome.' };
    if (!/^[A-Z]$/.test(initial)) return { error: 'Inserisci una sola lettera per il cognome.' };
    if (text.length < 5) return { error: 'La descrizione deve avere almeno 5 caratteri.' };

    return { data: { name: name, initial: initial, stars: rating, text: text } };
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!window.SiteFirebase.isConfigured()) {
      setFormStatus('Firebase non è configurato: compila firebase-config.js per salvare.', 'error');
      return;
    }

    var result = readForm();
    if (result.error) {
      setFormStatus(result.error, 'error');
      return;
    }

    var submit = $('#reviewSubmit');
    submit.disabled = true;
    setFormStatus('Salvataggio in corso…', 'info');

    var wasEditing = Boolean(editingId);
    var action = wasEditing
      ? window.SiteFirebase.updateReview(editingId, result.data)
      : window.SiteFirebase.addReview(result.data);

    action
      .then(function () {
        resetForm();
        toast(wasEditing ? 'Recensione aggiornata.' : 'Recensione pubblicata.', 'ok');
      })
      .catch(function (error) {
        setFormStatus(formatError(error), 'error');
      })
      .then(function () { submit.disabled = false; });
  });

  /* ---------------- eliminazione ---------------- */

  function askDelete(review) {
    pendingDeleteId = review.id;
    modal.hidden = false;
    var confirmBtn = $('[data-modal="confirm"]', modal);
    if (confirmBtn) confirmBtn.focus();
  }

  function closeModal() {
    pendingDeleteId = null;
    modal.hidden = true;
  }

  modal.addEventListener('click', function (event) {
    var action = event.target.closest('[data-modal]');
    if (event.target === modal) { closeModal(); return; }
    if (!action) return;

    if (action.dataset.modal === 'cancel') { closeModal(); return; }

    if (action.dataset.modal === 'confirm' && pendingDeleteId) {
      var id = pendingDeleteId;
      closeModal();

      window.SiteFirebase.deleteReview(id)
        .then(function () { toast('Recensione eliminata.', 'ok'); })
        .catch(function (error) { toast(formatError(error), 'error'); });
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------------- ricerca ---------------- */

  searchInput.addEventListener('input', function () {
    filterText = searchInput.value.trim().toLowerCase();
    renderList();
  });

  $('#searchBtn').addEventListener('click', function () {
    searchInput.focus();
  });

  /* ---------------- dati ---------------- */

  function updateStats(source) {
    $('#statTotal').textContent = String(reviews.length);

    if (reviews.length) {
      var sum = reviews.reduce(function (total, review) { return total + review.stars; }, 0);
      $('#statAverage').textContent = (sum / reviews.length).toFixed(1).replace('.', ',');
    } else {
      $('#statAverage').textContent = '—';
    }

    $('#statSource').textContent = source;
  }

  function onReviews(list, source) {
    reviews = list;
    renderList();
    updateStats(source);
  }

  function startReviews() {
    if (unsubscribe) return;

    updateStats('Firebase');

    unsubscribe = window.SiteFirebase.subscribeReviews(
      function (list) { onReviews(list, 'Firebase'); },
      function (error) {
        $('#overviewNote').textContent = formatError(error);
        updateStats('Locale');
      }
    );
  }

  /* ---------------- avvio ---------------- */

  function init() {
    if (!window.SiteFirebase) {
      showGate('Modulo Firebase non caricato.', true);
      return;
    }

    if (!window.SiteFirebase.isConfigured()) {
      loginBtn.disabled = true;
      showGate(
        'Firebase non è ancora configurato: incolla i dati del progetto in firebase-config.js e pubblica le regole di regolefirebase.txt.',
        true
      );
      return;
    }

    window.SiteFirebase.onAuthChange(function (user) {
      if (!user) {
        showGate('');
        return;
      }

      if (!window.SiteFirebase.isAdminEmail(user.email)) {
        showGate('Accesso negato: l’account ' + user.email + ' non è abilitato.', true);
        window.SiteFirebase.signOutUser();
        return;
      }

      showApp(user);
      startReviews();
    });
  }

  init();
})();
