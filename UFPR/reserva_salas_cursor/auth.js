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
    if (!isValidUFPRemail(email)) {
        throw new Error('Apenas emails @ufpr.br são permitidos');
    }

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        // Enviar email de verificação
        await userCredential.user.sendEmailVerification();
        return userCredential.user;
    } catch (error) {
        console.error('Erro no registro:', error);
        throw error;
    }
}

// Login do usuário
async function loginUser(email, password) {
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            await firebase.auth().signOut();
            throw new Error('Por favor, verifique seu email antes de fazer login');
        }
        
        return user;
    } catch (error) {
        console.error('Erro no login:', error);
        throw error;
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
    
    // Event listeners para os formulários
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await loginUser(email, password);
            showToast('Login realizado com sucesso!', 'success');
            showAuthButtons();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
    
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showToast('As senhas não coincidem', 'error');
            return;
        }
        
        try {
            await registerUser(email, password);
            showToast('Registro realizado! Por favor, verifique seu email.', 'success');
            showAuthButtons();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
    
    // Event listeners para os botões
    document.getElementById('showLoginBtn').addEventListener('click', showLoginForm);
    document.getElementById('showRegisterBtn').addEventListener('click', showRegisterForm);
    document.getElementById('backToAuthBtn').addEventListener('click', showAuthButtons);
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await logoutUser();
            showToast('Logout realizado com sucesso!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}); 