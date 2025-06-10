// Gerenciamento de Autenticação
let currentUser = null;

// Inicializar autenticação
function initializeAuth() {
    console.log('Inicializando autenticação...');
    
    if (!firebaseInitialized) {
        console.error('Firebase não inicializado');
        throw new Error('Firebase não inicializado');
    }

    // Configurar listener de autenticação
    firebase.auth().onAuthStateChanged(async (user) => {
        console.log('Estado de autenticação mudou:', user ? user.email : 'não logado');
        
        try {
            if (user) {
                // Recarregar o usuário para garantir dados atualizados
                console.log('Recarregando dados do usuário...');
                await user.reload();
                const updatedUser = firebase.auth().currentUser;
                
                if (!updatedUser) {
                    console.error('Usuário não encontrado após reload');
                    currentUser = null;
                    updateAuthUI();
                    return;
                }
                
                console.log('Estado do email verificado:', updatedUser.emailVerified);
                currentUser = updatedUser;
                
            } else {
                console.log('Nenhum usuário logado');
                currentUser = null;
            }
            
            // Atualizar interface
            updateAuthUI();
            
        } catch (error) {
            console.error('Erro ao atualizar estado de autenticação:', error);
            currentUser = null;
            updateAuthUI();
        }
    });
    
    console.log('Autenticação inicializada com sucesso');
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
    console.log('Iniciando processo de logout...');
    
    try {
        // Verificar se há um usuário logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('Nenhum usuário logado para fazer logout');
            return;
        }

        console.log('Fazendo logout do usuário:', user.email);
        
        // Fazer logout
        await firebase.auth().signOut();
        console.log('Logout realizado com sucesso');
        
        // Limpar dados locais
        currentUser = null;
        
        // Mostrar mensagem de sucesso
        showToast('Logout realizado com sucesso', 'success');
        
        // Redirecionar para login
        console.log('Redirecionando para login.html...');
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        showToast('Erro ao fazer logout: ' + error.message, 'error');
    }
}

// Atualizar interface baseado no estado de autenticação
function updateAuthUI() {
    // Elementos que podem não existir em todas as páginas
    const authSection = document.getElementById('authSection');
    const userInfo = document.getElementById('userInfo');
    const authButtons = document.getElementById('authButtons');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userEmail = document.getElementById('userEmail');
    const reserveButtons = document.querySelectorAll('.reserve-btn');
    
    // Se estiver na página de login, não precisa atualizar a UI
    if (window.location.pathname.includes('login.html')) {
        console.log('Na página de login, pulando atualização da UI');
        return;
    }
    
    if (currentUser) {
        // Usuário está logado
        if (authSection) authSection.classList.remove('hidden');
        if (userInfo) userInfo.classList.remove('hidden');
        if (authButtons) authButtons.classList.add('hidden');
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        
        // Atualizar informações do usuário
        if (userEmail) userEmail.textContent = currentUser.email;
        
        // Atualizar botões de reserva
        reserveButtons.forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.title = '';
            }
        });
    } else {
        // Usuário não está logado
        if (authSection) authSection.classList.add('hidden');
        if (userInfo) userInfo.classList.add('hidden');
        if (authButtons) authButtons.classList.remove('hidden');
        
        // Desabilitar botões de reserva
        reserveButtons.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.title = 'Faça login para reservar salas';
            }
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
    console.log('Inicializando autenticação...');
    initializeAuth();
    
    // Event listeners para os botões
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const backToAuthFromLogin = document.getElementById('backToAuthFromLogin');
    const backToAuthFromRegister = document.getElementById('backToAuthFromRegister');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (showLoginBtn) showLoginBtn.addEventListener('click', showLoginForm);
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', showRegisterForm);
    if (backToAuthFromLogin) backToAuthFromLogin.addEventListener('click', showAuthButtons);
    if (backToAuthFromRegister) backToAuthFromRegister.addEventListener('click', showAuthButtons);
    
    // Event listener para logout (apenas se o botão existir)
    if (logoutBtn) {
        console.log('Botão de logout encontrado, adicionando event listener...');
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão de logout clicado');
            try {
                await logoutUser();
            } catch (error) {
                console.error('Erro no logout:', error);
                showToast(error.message, 'error');
            }
            return false;
        });
    } else {
        console.log('Botão de logout não encontrado');
    }
}); 