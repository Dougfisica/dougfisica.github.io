// Gerenciamento de Autenticação
let currentUser = null;

// Inicializar autenticação
function initializeAuth() {
    if (!firebaseInitialized) return;
    
    const auth = firebase.auth();
    
    // Observar mudanças no estado de autenticação
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateAuthUI();
    });
}

// Verificar se o email é @ufpr.br
function isValidUFPRemail(email) {
    return email.endsWith('@ufpr.br');
}

// Registrar novo usuário
async function registerUser(email, password) {
    console.log('Iniciando registro de usuário:', email);
    
    if (!firebaseInitialized) {
        console.error('Firebase não inicializado');
        throw new Error('Sistema não inicializado corretamente');
    }
    
    if (!isValidUFPRemail(email)) {
        console.error('Email inválido:', email);
        throw new Error('Apenas emails @ufpr.br são permitidos');
    }

    if (password.length < 6) {
        console.error('Senha muito curta');
        throw new Error('A senha deve ter pelo menos 6 caracteres');
    }

    try {
        console.log('Criando usuário no Firebase...');
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('Usuário criado:', userCredential.user.uid);
        
        console.log('Enviando email de verificação...');
        await userCredential.user.sendEmailVerification();
        console.log('Email de verificação enviado');
        
        return userCredential.user;
    } catch (error) {
        console.error('Erro detalhado no registro:', error);
        
        // Mensagens de erro mais amigáveis
        switch (error.code) {
            case 'auth/email-already-in-use':
                throw new Error('Este email já está em uso');
            case 'auth/invalid-email':
                throw new Error('Email inválido');
            case 'auth/operation-not-allowed':
                throw new Error('Registro de usuários está desativado');
            case 'auth/weak-password':
                throw new Error('A senha é muito fraca');
            default:
                throw new Error('Erro ao registrar: ' + error.message);
        }
    }
}

// Login do usuário
async function loginUser(email, password) {
    console.log('Iniciando login:', email);
    
    if (!firebaseInitialized) {
        console.error('Firebase não inicializado');
        throw new Error('Sistema não inicializado corretamente');
    }
    
    if (!isValidUFPRemail(email)) {
        console.error('Email inválido:', email);
        throw new Error('Apenas emails @ufpr.br são permitidos');
    }

    try {
        console.log('Tentando autenticar com Firebase...');
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('Usuário autenticado:', user.uid);
        
        if (!user.emailVerified) {
            console.log('Email não verificado, fazendo logout...');
            await firebase.auth().signOut();
            throw new Error('Por favor, verifique seu email antes de fazer login');
        }
        
        console.log('Login bem sucedido');
        return user;
    } catch (error) {
        console.error('Erro detalhado no login:', error);
        
        // Mensagens de erro mais amigáveis
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                throw new Error('Email ou senha incorretos');
            case 'auth/invalid-email':
                throw new Error('Email inválido');
            case 'auth/user-disabled':
                throw new Error('Esta conta foi desativada');
            case 'auth/too-many-requests':
                throw new Error('Muitas tentativas de login. Tente novamente mais tarde');
            default:
                throw new Error('Erro ao fazer login: ' + error.message);
        }
    }
}

// Logout do usuário
async function logoutUser() {
    try {
        await firebase.auth().signOut();
    } catch (error) {
        console.error('Erro no logout:', error);
        throw error;
    }
}

// Atualizar interface baseado no estado de autenticação
function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    const userInfo = document.getElementById('userInfo');
    const authButtons = document.getElementById('authButtons');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (currentUser) {
        // Usuário está logado
        authSection.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        authButtons.classList.add('hidden');
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        
        // Atualizar informações do usuário
        document.getElementById('userEmail').textContent = currentUser.email;
        
        // Atualizar botão de reserva
        const reserveButtons = document.querySelectorAll('.reserve-btn');
        reserveButtons.forEach(btn => {
            btn.disabled = false;
            btn.title = '';
        });
    } else {
        // Usuário não está logado
        authSection.classList.add('hidden');
        userInfo.classList.add('hidden');
        authButtons.classList.remove('hidden');
        
        // Desabilitar botões de reserva
        const reserveButtons = document.querySelectorAll('.reserve-btn');
        reserveButtons.forEach(btn => {
            btn.disabled = true;
            btn.title = 'Faça login para reservar salas';
        });
    }
}

// Mostrar formulário de login
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('authButtons').classList.add('hidden');
}

// Mostrar formulário de registro
function showRegisterForm() {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('authButtons').classList.add('hidden');
}

// Voltar para os botões de autenticação
function showAuthButtons() {
    document.getElementById('authButtons').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    
    // Event listeners para os botões
    document.getElementById('showLoginBtn').addEventListener('click', showLoginForm);
    document.getElementById('showRegisterBtn').addEventListener('click', showRegisterForm);
    document.getElementById('backToAuthFromLogin').addEventListener('click', showAuthButtons);
    document.getElementById('backToAuthFromRegister').addEventListener('click', showAuthButtons);
    
    // Event listener para logout (apenas se o botão existir)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await logoutUser();
                showToast('Logout realizado com sucesso!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
}); 