/**
 * Arquivo de configuração do Firebase.
 * Usa SDK em modo compat para facilitar integração no ambiente atual.
 */

// TODO: Substituir pelas credenciais reais do projeto do Firebase
const firebaseConfig = {
    apiKey: "AIzaSy_YOUR_API_KEY_HERE",
    authDomain: "a7system-app.firebaseapp.com",
    projectId: "a7system-app",
    storageBucket: "a7system-app.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef1234567890"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);

// Obter referências dos serviços
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// App Check (Opcional - Ativar para produção)
// try {
//   const appCheck = firebase.appCheck();
//   appCheck.activate(
//     'YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY',
//     true // Define to true para forçar token auto-refresh
//   );
// } catch (e) {
//   console.error("Falha ao inicializar App Check", e);
// }

// Descomentar para conectar ao emulador se estiver rodando localmente
// if (window.location.hostname === "localhost") {
//     auth.useEmulator("http://localhost:9099");
//     db.useEmulator("localhost", 8080);
//     storage.useEmulator("localhost", 9199);
// }

// Disponibilizar no escopo global para outros scripts
window.db = db;
window.auth = auth;
window.storage = storage;
window.firebaseApp = app;
