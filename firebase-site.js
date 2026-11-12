/* ============================================================
   FIREBASE — modulo condiviso tra Home e Dashboard Admin
   ------------------------------------------------------------
   Carica l'SDK solo quando serve (import dinamico) e solo se
   firebase-config.js contiene una configurazione reale.
   Espone window.SiteFirebase.
   ============================================================ */
(function () {
  'use strict';

  var config = window.FIREBASE_CONFIG || {};
  var collectionName = window.REVIEWS_COLLECTION || 'reviews';
  var adminEmails = (window.ADMIN_EMAILS || []).map(function (mail) {
    return String(mail).toLowerCase();
  });

  var SDK = 'https://www.gstatic.com/firebasejs/13.3.0/';
  var configured = Boolean(config.apiKey && config.projectId)
    && !/INSERISCI/i.test(config.apiKey)
    && !/INSERISCI/i.test(config.projectId);

  var apiPromise = null;

  function loadApi() {
    if (!configured) {
      return Promise.reject(new Error('Firebase non configurato: compila firebase-config.js'));
    }

    if (!apiPromise) {
      apiPromise = Promise.all([
        import(SDK + 'firebase-app.js'),
        import(SDK + 'firebase-auth.js'),
        import(SDK + 'firebase-firestore.js'),
      ]).then(function (mods) {
        var appMod = mods[0];
        var authMod = mods[1];
        var dbMod = mods[2];

        var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(config);

        return {
          auth: authMod.getAuth(app),
          db: dbMod.getFirestore(app),
          authMod: authMod,
          dbMod: dbMod,
        };
      });
    }

    return apiPromise;
  }

  function isAdminEmail(email) {
    return Boolean(email) && adminEmails.indexOf(String(email).toLowerCase()) !== -1;
  }

  /* Converte il documento Firestore nel formato usato dal sito. */
  function toReview(doc) {
    var data = doc.data() || {};
    var initial = (data.initial || '').trim().toUpperCase();
    var created = data.createdAt && typeof data.createdAt.toMillis === 'function'
      ? data.createdAt.toMillis()
      : 0;

    return {
      id: doc.id,
      name: (data.name || '').trim(),
      initial: initial,
      label: ((data.name || '').trim() + ' ' + initial + '.').trim(),
      stars: Math.max(1, Math.min(5, Number(data.stars) || 5)),
      text: (data.text || '').trim(),
      role: 'Recensione verificata',
      createdAt: created,
    };
  }

  /* Ascolta la raccolta recensioni e restituisce la funzione per
     interrompere l'ascolto. */
  function subscribeReviews(onChange, onError) {
    var unsubscribe = null;
    var closed = false;

    loadApi()
      .then(function (api) {
        if (closed) return;

        unsubscribe = api.dbMod.onSnapshot(
          api.dbMod.collection(api.db, collectionName),
          function (snapshot) {
            var list = snapshot.docs.map(toReview);
            list.sort(function (a, b) { return b.createdAt - a.createdAt; });
            onChange(list);
          },
          function (error) { if (onError) onError(error); }
        );
      })
      .catch(function (error) { if (onError) onError(error); });

    return function () {
      closed = true;
      if (unsubscribe) unsubscribe();
    };
  }

  function stampNow(api, extra) {
    var payload = Object.assign({}, extra);
    payload.updatedAt = api.dbMod.serverTimestamp();
    return payload;
  }

  function addReview(data) {
    return loadApi().then(function (api) {
      return api.dbMod.addDoc(
        api.dbMod.collection(api.db, collectionName),
        {
          name: data.name,
          initial: data.initial,
          stars: data.stars,
          text: data.text,
          createdAt: api.dbMod.serverTimestamp(),
          updatedAt: api.dbMod.serverTimestamp(),
          authorUid: api.auth.currentUser ? api.auth.currentUser.uid : '',
          authorEmail: api.auth.currentUser ? api.auth.currentUser.email || '' : '',
        }
      );
    });
  }

  function updateReview(id, data) {
    return loadApi().then(function (api) {
      return api.dbMod.updateDoc(
        api.dbMod.doc(api.db, collectionName, id),
        stampNow(api, { name: data.name, initial: data.initial, stars: data.stars, text: data.text })
      );
    });
  }

  function deleteReview(id) {
    return loadApi().then(function (api) {
      return api.dbMod.deleteDoc(api.dbMod.doc(api.db, collectionName, id));
    });
  }

  function onAuthChange(callback) {
    loadApi()
      .then(function (api) {
        api.authMod.onAuthStateChanged(api.auth, function (user) {
          callback(user || null);
        });
      })
      .catch(function () {
        callback(null);
      });
  }

  /* Il popup può essere bloccato dal browser: in quel caso si passa
     al redirect, che riporta l'utente sulla stessa pagina già
     autenticato (l'ascolto onAuthStateChanged fa il resto). */
  function signInWithGoogle() {
    return loadApi().then(function (api) {
      var provider = new api.authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      return api.authMod.signInWithPopup(api.auth, provider).catch(function (error) {
        var code = (error && error.code) || '';
        var ripiega =
          code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/cancelled-popup-request';

        if (!ripiega) throw error;
        return api.authMod.signInWithRedirect(api.auth, provider);
      });
    });
  }

  /* Recupera l'esito di un accesso fatto via redirect. */
  function completeRedirect() {
    return loadApi()
      .then(function (api) { return api.authMod.getRedirectResult(api.auth); })
      .catch(function (error) { return error; });
  }

  function signOutUser() {
    return loadApi().then(function (api) {
      return api.authMod.signOut(api.auth);
    });
  }

  window.SiteFirebase = {
    isConfigured: function () { return configured; },
    isAdminEmail: isAdminEmail,
    getApi: loadApi,
    onAuthChange: onAuthChange,
    signInWithGoogle: signInWithGoogle,
    completeRedirect: completeRedirect,
    signOutUser: signOutUser,
    subscribeReviews: subscribeReviews,
    addReview: addReview,
    updateReview: updateReview,
    deleteReview: deleteReview,
  };
})();
