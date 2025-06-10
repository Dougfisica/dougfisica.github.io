// Configuração do Firebase
// INSTRUÇÕES:
// 1. Vá para https://console.firebase.google.com/
// 2. Crie um novo projeto ou use um existente
// 3. Ative o Realtime Database
// 4. Nas configurações do projeto, copie as informações abaixo
// 5. Substitua os valores "SEU_..." pelos seus dados reais

const firebaseConfig = {
  apiKey: "AIzaSyDiCeCx-uNjVLksCUWev6rP2d6jRq6qfsc",
  authDomain: "salasufpr.firebaseapp.com",
  databaseURL: "https://salasufpr-default-rtdb.firebaseio.com",
  projectId: "salasufpr",
  storageBucket: "salasufpr.firebasestorage.app",
  messagingSenderId: "1044395782294",
  appId: "1:1044395782294:web:d2e00a83a43d1952a892b7",
  measurementId: "G-8BFC3PGW91"
};



// Inicializar Firebase
let database = null;
let firebaseInitialized = false;

function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "SUA_API_KEY") {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            firebaseInitialized = true;
            console.log('Firebase inicializado com sucesso');
            return true;
        } else {
            console.log('Firebase não configurado - usando armazenamento local');
            return false;
        }
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        return false;
    }
}

// Função para salvar no Firebase
async function saveToFirebase(path, data) {
    if (!firebaseInitialized) {
        throw new Error('Firebase não está configurado');
    }
    
    try {
        const ref = database.ref(path).push();
        await ref.set(data);
        return ref.key;
    } catch (error) {
        console.error('Erro ao salvar no Firebase:', error);
        throw error;
    }
}

// Função para carregar do Firebase
async function loadFromFirebase(path) {
    if (!firebaseInitialized) {
        throw new Error('Firebase não está configurado');
    }
    
    try {
        const snapshot = await database.ref(path).once('value');
        const data = snapshot.val();
        return data ? Object.values(data) : [];
    } catch (error) {
        console.error('Erro ao carregar do Firebase:', error);
        throw error;
    }
} 