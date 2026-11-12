/* ============================================================
   CONFIGURAZIONE FIREBASE
   ------------------------------------------------------------
   Progetto: recensioni-a1b26
   Console Firebase → Impostazioni progetto → Le tue app →
   "Configurazione SDK" → Config.

   Se un valore viene sostituito con un segnaposto contenente
   "INSERISCI" il sito torna in modalità locale: la Home mostra le
   recensioni dimostrative e la Dashboard avvisa che Firebase non
   è configurato.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCVJ9M5tsuL06Lew9xPvn8beJIlar1Ee0w',
  authDomain: 'recensioni-a1b26.firebaseapp.com',
  databaseURL: 'https://recensioni-a1b26-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'recensioni-a1b26',
  storageBucket: 'recensioni-a1b26.firebasestorage.app',
  messagingSenderId: '699758703249',
  appId: '1:699758703249:web:c73a6041000cd313720530',
  measurementId: 'G-9HV4FHNEH4',
};

/* Email autorizzate ad amministrare il sito.
   Devono essere identiche a quelle elencate nella funzione
   isAdmin() di regolefirebase.txt. */
window.ADMIN_EMAILS = ['angelicafrascarolopt@gmail.com'];

/* Nome della raccolta Firestore che contiene le recensioni. */
window.REVIEWS_COLLECTION = 'reviews';
