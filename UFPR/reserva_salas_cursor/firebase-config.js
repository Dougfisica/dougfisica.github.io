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
    try {
        console.log('Iniciando configuração do Firebase...');
        
        // Verificar se o Firebase já está inicializado
        if (firebase.apps.length > 0) {
            console.log('Firebase já está inicializado');
            firebaseInitialized = true;
            return true;
        }
        
        // Configuração do Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyDxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
            authDomain: "reserva-salas-ufpr.firebaseapp.com",
            databaseURL: "https://reserva-salas-ufpr.firebaseio.com",
            projectId: "reserva-salas-ufpr",
            storageBucket: "reserva-salas-ufpr.appspot.com",
            messagingSenderId: "123456789012",
            appId: "1:123456789012:web:abcdef1234567890"
        };
        
        // Inicializar Firebase
        firebase.initializeApp(firebaseConfig);
        
        // Verificar se o Database está disponível
        if (typeof firebase.database === 'function') {
            console.log('Firebase Database inicializado com sucesso');
            firebaseInitialized = true;
            return true;
        } else {
            console.error('Firebase Database não está disponível');
            return false;
        }
        
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        firebaseInitialized = false;
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
    if (!firebaseInitialized) {
        throw new Error('Firebase não está inicializado');
    }
    
    try {
        const snapshot = await firebase.database().ref(path).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Erro ao carregar do Firebase:', error);
        throw error;
    }
} 