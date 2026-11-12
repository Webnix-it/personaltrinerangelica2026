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

    /* Errori di accesso: spiegano cosa sistemare nella Console Firebase. */
    if (code.indexOf('unauthorized-domain') !== -1) {
      return (
        'Dominio non autorizzato. In Firebase → Authentication → Settings → Authorized domains aggiungi ' +
        window.location.origin +
        ' (per i test in locale aggiungi anche localhost).'
      );
    }
    if (code.indexOf('operation-not-allowed') !== -1) {
      return 'Il provider Google non è attivo: Firebase → Authentication → Sign-in method → Google → Attiva.';
    }
    if (code.indexOf('popup-blocked') !== -1) {
      return 'Il browser ha bloccato la finestra di accesso: consenti i popup per questo sito e riprova.';
    }
    if (code.indexOf('invalid-api-key') !== -1) {
      return 'La apiKey in firebase-config.js non è valida: ricontrolla la configurazione del progetto.';
    }
    if (code.indexOf('network-request-failed') !== -1) {
      return 'Connessione a Firebase non disponibile: controlla la rete e riprova.';
    }
    if (code.indexOf('account-exists-with-different-credential') !== -1) {
      return 'Questo indirizzo è già registrato con un altro metodo di accesso.';
    }

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

  /* 127.0.0.1 non è tra i domini autorizzati del progetto Firebase:
     il popup di Google si apre ma non riesce a tornare indietro. */
  function localHostHint() {
    var host = window.location.hostname;
    if (host !== '127.0.0.1' && host !== '[::1]') return '';
    return (
      'Apri la dashboard da http://localhost:' + (window.location.port || '80') +
      '/admin.html: il dominio 127.0.0.1 non è autorizzato in Firebase, quindi l’accesso Google non si completa.'
    );
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
        if (localHostHint()) {
          gateStatus.textContent = localHostHint();
          gateStatus.className = 'admin-gate-status is-error';
          return;
        }
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

  /* ---------------- impostazioni del sito ---------------- */

  var settingsData = {};
  var settingsStarted = false;

  /* Valori usati finché la sezione non è mai stata salvata. */
  var SETTING_DEFAULTS = {
    'images.chiSono': 'https://ricomincia-angelica.higgsfield.app/ricomincia/assets/angelica-professionale.webp',
    'images.chiSono2': 'foto1.png',
    'images.metodo': 'foto1.png',
  };

  /* Trasforma quello che scrive l'utente in un collegamento vero:
     email → mailto:, numero → wa.me, URL → così com'è. */
  function normalizeLink(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
    if (raw.indexOf('@') !== -1) return 'mailto:' + raw;
    if (/^[\d\s()+.-]+$/.test(raw)) return 'https://wa.me/' + raw.replace(/\D/g, '');
    return raw;
  }

  /* Anteprima dei pulsanti: usa il valore digitato nel campo. */
  function updateButtonPreviews() {
    $$('[data-button-preview]').forEach(function (link) {
      var path = link.getAttribute('data-button-preview');
      var input = $('[data-setting="' + path + '"]');
      var value = input ? input.value.trim() : '';
      var href = normalizeLink(value);

      link.setAttribute('href', href || '#');
      link.title = value ? href : 'Nessun collegamento impostato: resta quello predefinito del sito.';
    });
  }

  function getPath(object, path) {
    return path.split('.').reduce(function (value, key) {
      return value && typeof value === 'object' ? value[key] : undefined;
    }, object);
  }

  function setPath(object, path, value) {
    var keys = path.split('.');
    var current = object;

    keys.forEach(function (key, index) {
      if (index === keys.length - 1) {
        current[key] = value;
        return;
      }
      if (!current[key] || typeof current[key] !== 'object') current[key] = {};
      current = current[key];
    });
  }

  function updatePreviews() {
    $$('[data-preview]').forEach(function (img) {
      var path = img.getAttribute('data-preview');
      var value = getPath(settingsData, path) || SETTING_DEFAULTS[path] || '';
      if (value) img.src = value;
    });
  }

  function updateCurrentLinks() {
    $$('[data-current]').forEach(function (element) {
      var value = getPath(settingsData, element.getAttribute('data-current'));
      element.textContent = 'Collegamento attuale: ' + (value || 'predefinito del sito');
    });
  }

  function fillSettings(settings) {
    settingsData = settings || {};

    $$('[data-setting]').forEach(function (input) {
      if (document.activeElement === input) return;

      var path = input.getAttribute('data-setting');
      var value = getPath(settingsData, path);

      if (input.type === 'checkbox') {
        var fallback = path.indexOf('social.') === 0;
        input.checked = value === undefined ? fallback : Boolean(value);
        return;
      }

      if (value === undefined) value = SETTING_DEFAULTS[path];
      input.value = value === undefined || value === null ? '' : String(value);
    });

    updatePreviews();
    updateCurrentLinks();
    updateButtonPreviews();
  }

  function startSettings() {
    if (settingsStarted) return;
    settingsStarted = true;

    window.SiteFirebase.subscribeSettings(
      function (settings) { fillSettings(settings); },
      function (error) {
        var status = $('#maintenanceStatus');
        if (status) {
          status.textContent = formatError(error);
          status.className = 'admin-form-status is-error';
        }
      }
    );
  }

  /* Anteprima live dell'immagine digitata. */
  $$('[data-setting]').forEach(function (input) {
    input.addEventListener('input', function () {
      var path = input.getAttribute('data-setting');
      $$('[data-preview-typed="' + path + '"]').forEach(function (img) {
        var value = input.value.trim();
        if (value) img.src = value;
      });

      updateButtonPreviews();
    });
  });

  /* Salvataggio per singolo pannello. */
  $$('[data-save-settings]').forEach(function (button) {
    button.addEventListener('click', function () {
      var group = button.getAttribute('data-save-settings');
      var form = $('[data-settings-form="' + group + '"]');
      var status = $('[data-settings-status="' + group + '"]');
      if (!form) return;

      var payload = {};

      $$('[data-setting]', form).forEach(function (input) {
        var path = input.getAttribute('data-setting');
        var value = input.type === 'checkbox' ? input.checked : input.value.trim();
        setPath(payload, path, value);
      });

      button.disabled = true;
      if (status) {
        status.textContent = 'Salvataggio…';
        status.className = 'admin-form-status';
      }

      window.SiteFirebase.saveSettings(payload)
        .then(function () {
          if (status) {
            status.textContent = 'Salvato. Le modifiche sono già online.';
            status.className = 'admin-form-status is-info';
          }

          /* Aggiorna i riferimenti locali senza aspettare un nuovo snapshot. */
          $$('[data-setting]', form).forEach(function (input) {
            var path = input.getAttribute('data-setting');
            setPath(settingsData, path, input.type === 'checkbox' ? input.checked : input.value.trim());
          });

          updatePreviews();
          updateCurrentLinks();
          updateButtonPreviews();
          toast('Impostazioni salvate.');
        })
        .catch(function (error) {
          if (status) {
            status.textContent = formatError(error);
            status.className = 'admin-form-status is-error';
          }
        })
        .then(function () { button.disabled = false; });
    });
  });

  /* Mostra subito le anteprime predefinite, prima del login. */
  updatePreviews();
  updateCurrentLinks();
  updateButtonPreviews();

  /* Banner di manutenzione: il toggle salva subito. */
  var maintenanceToggle = $('#maintenanceToggle');
  var maintenanceStatus = $('#maintenanceStatus');

  if (maintenanceToggle) {
    maintenanceToggle.addEventListener('change', function () {
      var on = maintenanceToggle.checked;
      maintenanceToggle.disabled = true;

      if (maintenanceStatus) {
        maintenanceStatus.textContent = on ? 'Attivazione del banner…' : 'Disattivazione del banner…';
        maintenanceStatus.className = 'admin-form-status';
      }

      window.SiteFirebase.saveSettings({ maintenance: { on: on } })
        .then(function () {
          settingsData.maintenance = { on: on };
          if (maintenanceStatus) {
            maintenanceStatus.textContent = on
              ? 'Banner attivo sulla Home.'
              : 'Banner nascosto: non occupa spazio.';
            maintenanceStatus.className = 'admin-form-status is-info';
          }
          toast(on ? 'Banner di manutenzione attivato.' : 'Banner di manutenzione disattivato.');
        })
        .catch(function (error) {
          maintenanceToggle.checked = !on;
          if (maintenanceStatus) {
            maintenanceStatus.textContent = formatError(error);
            maintenanceStatus.className = 'admin-form-status is-error';
          }
        })
        .then(function () { maintenanceToggle.disabled = false; });
    });
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

    /* Se si arriva da un accesso via redirect, eventuali errori vanno mostrati. */
    if (typeof window.SiteFirebase.completeRedirect === 'function') {
      window.SiteFirebase.completeRedirect().then(function (result) {
        if (result && result.code) {
          showGate(formatError(result), true);
        }
      });
    }

    window.SiteFirebase.onAuthChange(function (user) {
      if (!user) {
        var hint = localHostHint();
        showGate(hint, Boolean(hint));
        return;
      }

      if (!window.SiteFirebase.isAdminEmail(user.email)) {
        var autorizzati = (window.ADMIN_EMAILS || []).join(', ');
        showGate(
          'Accesso negato: l’account ' + (user.email || 'sconosciuto') + ' non è abilitato.' +
            (autorizzati ? ' Account autorizzato: ' + autorizzati : ''),
          true
        );
        window.SiteFirebase.signOutUser();
        return;
      }

      showApp(user);
      startReviews();
      startSettings();
    });
  }

  init();
})();
