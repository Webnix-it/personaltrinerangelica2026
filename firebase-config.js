/* ============================================================
   CONFIGURAZIONE FIREBASE
   ------------------------------------------------------------
   Progetto: app-x-utenti
   Console Firebase → Impostazioni progetto → Le tue app →
   "Configurazione SDK" → Config.

   Se un valore viene sostituito con un segnaposto contenente
   "INSERISCI" il sito torna in modalità locale: la Home mostra le
   recensioni dimostrative e la Dashboard avvisa che Firebase non
   è configurato.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA4Sq6gIqN3LHadf8Hj6lFM5kAnHBnELa0',
  authDomain: 'app-x-utenti.firebaseapp.com',
  projectId: 'app-x-utenti',
  storageBucket: 'app-x-utenti.firebasestorage.app',
  messagingSenderId: '596645943466',
  appId: '1:596645943466:web:32c4c42b22c593f24c58d3',
};

/* Email autorizzate ad amministrare il sito.
   Devono essere identiche a quelle elencate nella funzione
   isAdmin() di regolefirebase.txt. */
window.ADMIN_EMAILS = ['angelicafrascarolopt@gmail.com'];

/* Nome della raccolta Firestore che contiene le recensioni. */
window.REVIEWS_COLLECTION = 'reviews';
