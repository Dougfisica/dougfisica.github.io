// Configuração do Firebase
// INSTRUÇÕES:
// 1. Vá para https://console.firebase.google.com/
// 2. Crie um novo projeto ou use um existente
// 3. Ative o Realtime Database
// 4. Nas configurações do projeto, copie as informações abaixo
// 5. Substitua os valores "SEU_..." pelos seus dados reais

let firebaseInitialized = false;

// Inicializar Firebase
function initializeFirebase() {
    console.log('Iniciando configuração do Firebase...');
    
    try {
        // Verificar se o Firebase já está inicializado
        if (firebase.apps.length > 0) {
            console.log('Firebase já está inicializado');
            firebaseInitialized = true;
            return true;
        }
        
        // Configuração do Firebase
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
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase inicializado com sucesso');
        
        // Verificar se o Firebase Database está disponível
        if (firebase.database) {
            console.log('Firebase Database inicializado com sucesso');
            firebaseInitialized = true;
            return true;
        } else {
            console.error('Firebase Database não está disponível');
            return false;
        }
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        return false;
    }
}

// Salvar dados no Firebase
async function saveToFirebase(path, data) {
    if (!firebaseInitialized) {
        throw new Error('Firebase não está inicializado');
    }
    
    try {
        const ref = firebase.database().ref(path);
        const newRef = ref.push();
        await newRef.set(data);
        return newRef.key;
    } catch (error) {
        console.error('Erro ao salvar no Firebase:', error);
        throw error;
    }
}

// Carregar dados do Firebase
async function loadFromFirebase(path) {
    console.log('Carregando dados do Firebase:', path);
    
    if (!firebaseInitialized) {
        console.error('Firebase não inicializado');
        throw new Error('Firebase não inicializado');
    }

    try {
        const snapshot = await firebase.database().ref(path).once('value');
        const data = snapshot.val();
        console.log('Dados carregados do Firebase:', path, data);
        
        // Se for um objeto, converter para array
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            console.log('Convertendo objeto para array...');
            const array = Object.values(data);
            console.log('Array convertido:', array);
            return array;
        }
        
        // Se for null ou undefined, retornar array vazio
        if (!data) {
            console.log('Nenhum dado encontrado, retornando array vazio');
            return [];
        }
        
        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            console.log('Dados já são um array');
            return data;
        }
        
        // Se chegou aqui, algo deu errado
        console.warn('Formato de dados inesperado:', typeof data);
        return [];
        
    } catch (error) {
        console.error('Erro ao carregar dados do Firebase:', error);
        throw error;
    }
} 