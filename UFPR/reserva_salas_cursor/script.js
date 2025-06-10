// Sistema de Reservas de Salas - UFPR

// Estados da aplicação
let gradeData = [];
let allRooms = [];
let currentSearchData = null;
let reservations = []; // Armazenará as reservas (localmente por enquanto)

// Elementos do DOM
const searchForm = document.getElementById('searchForm');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const searchInfo = document.getElementById('searchInfo');
const availableRoomsList = document.getElementById('availableRoomsList');
const occupiedRoomsList = document.getElementById('occupiedRoomsList');
const confirmModal = document.getElementById('confirmModal');
const overlay = document.getElementById('overlay');
const toast = document.getElementById('toast');

// --- Autenticação / logout ---
let firebaseInitialized = false;   // será marcado true depois da init
let currentUser         = null;    // usuário logado

const authSection   = document.getElementById('authSection');
const userEmailElem = document.getElementById('userEmail');
const logoutBtn     = document.getElementById('logoutBtn');

// Mapeamento de dias da semana
const daysOfWeek = {
    'Segunda': 1,
    'Terça': 2,
    'Quarta': 3,
    'Quinta': 4,
    'Sexta': 5,
    'Sábado': 6,
    'Domingo': 0
};

const daysOfWeekReverse = {
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
    0: 'Domingo'
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    populateDays();
});

// Inicializar aplicação
async function initializeApp() {
    try {
        // Tentar inicializar Firebase
        const firebaseOk = initializeFirebase();
        
        if (firebaseOk) {
            // Inicializar autenticação
            initializeAuth();
            firebaseInitialized = true;
setupAuthStateListener();   // cria o listener de auth

            showToast('Sistema carregado com Firebase!', 'success');
        } else {
            showToast('Sistema carregado (modo local)', 'success');
        }
        
        await loadGradeData();
        extractAllRooms();
        await loadReservations();
        
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        showToast('Erro ao carregar dados das salas', 'error');
    }
}

// Carregar dados da grade
async function loadGradeData() {
    try {
        const response = await fetch('grade_2025_2s.json');
        gradeData = await response.json();
        console.log('Dados carregados:', gradeData.length, 'disciplinas');
    } catch (error) {
        console.error('Erro ao carregar grade:', error);
        throw error;
    }
}

// Extrair todas as salas únicas
function extractAllRooms() {
    const roomsSet = new Set();
    gradeData.forEach(disciplina => {
        disciplina.Horarios.forEach(horario => {
            if (horario.sala && horario.sala !== '—') {
                roomsSet.add(horario.sala);
            }
        });
    });
    allRooms = Array.from(roomsSet).sort();
    console.log('Salas encontradas:', allRooms);
}

// Carregar reservas
async function loadReservations() {
    try {
        if (firebaseInitialized) {
            const data = await loadFromFirebase('reservations');
            // Garantir que reservations seja sempre um array
            reservations = Array.isArray(data) ? data : [];
            console.log('Reservas carregadas do Firebase:', reservations.length);
        } else {
            const saved = localStorage.getItem('ufpr_reservations');
            // Garantir que reservations seja sempre um array
            reservations = saved ? JSON.parse(saved) : [];
            if (!Array.isArray(reservations)) {
                console.warn('Dados de reservas inválidos, inicializando array vazio');
                reservations = [];
            }
            console.log('Reservas carregadas do localStorage:', reservations.length);
        }
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        // Fallback para array vazio
        reservations = [];
        console.log('Inicializando array de reservas vazio devido a erro');
    }
}

// Salvar reservas
async function saveReservations() {
    try {
        if (firebaseInitialized) {
            // Para Firebase, vamos salvar apenas a nova reserva
            // As outras já estão salvas
            console.log('Salvando reserva no Firebase...');
        } else {
            // Garantir que estamos salvando um array
            if (!Array.isArray(reservations)) {
                console.warn('Dados de reservas inválidos, convertendo para array');
                reservations = [];
            }
            localStorage.setItem('ufpr_reservations', JSON.stringify(reservations));
            console.log('Reservas salvas no localStorage:', reservations.length);
        }
    } catch (error) {
        console.error('Erro ao salvar reservas:', error);
        // Fallback para localStorage
        if (!Array.isArray(reservations)) {
            reservations = [];
        }
        localStorage.setItem('ufpr_reservations', JSON.stringify(reservations));
    }
}

// Popular dropdown de dias
function populateDays() {
    const daySelect = document.getElementById('day');
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i.toString().padStart(2, '0');
        daySelect.appendChild(option);
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Formulário de busca
    searchForm.addEventListener('submit', handleSearch);
    
    // Modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelReservation').addEventListener('click', closeModal);
    document.getElementById('confirmReservation').addEventListener('click', handleReservation);
    overlay.addEventListener('click', closeModal);
    
    // Toast
    document.getElementById('closeToast').addEventListener('click', hideToast);
    
    // Validação de horários
    document.getElementById('startTime').addEventListener('change', validateTimeRange);
    document.getElementById('endTime').addEventListener('change', validateTimeRange);
}
// Escuta mudanças de autenticação do Firebase
function setupAuthStateListener() {
    firebase.auth().onAuthStateChanged(user => {
        currentUser = (user && user.emailVerified) ? user : null;
        updateAuthUI(currentUser);

        // se não estiver logado, volta para a tela de login
        if (!currentUser) {
            setTimeout(() => window.location.replace('login.html'), 1500);
        }
    });
}

// Mostra / esconde a barra de usuário
function updateAuthUI(user) {
    if (!authSection) return;

    if (user) {
        userEmailElem.textContent = user.email;
        authSection.classList.remove('hidden');

        // garante que o listener de logout seja adicionado apenas uma vez
        if (!logoutBtn.dataset.listener) {
            logoutBtn.addEventListener('click', handleLogout);
            logoutBtn.dataset.listener = 'true';
        }
    } else {
        authSection.classList.add('hidden');
    }
}

// Logout
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        showToast('Sessão encerrada!', 'success');
        updateAuthUI(null);
        setTimeout(() => window.location.replace('login.html'), 1200);
    } catch (err) {
        console.error(err);
        showToast('Erro ao sair', 'error');
    }
}

// Validar intervalo de horários
function validateTimeRange() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (startTime && endTime) {
        const start = timeToMinutes(startTime);
        const end = timeToMinutes(endTime);
        
        if (end <= start) {
            showToast('Horário de fim deve ser maior que o de início', 'error');
            document.getElementById('endTime').value = '';
        }
    }
}

// Converter horário para minutos
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Lidar com busca
async function handleSearch(e) {
    e.preventDefault();
    
    const formData = new FormData(searchForm);
    const searchParams = {
        day: parseInt(formData.get('day')),
        month: parseInt(formData.get('month')),
        year: parseInt(formData.get('year')),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime')
    };
    
    // Validações
    if (!validateSearchParams(searchParams)) {
        return;
    }
    
    currentSearchData = searchParams;
    
    // Mostrar loading
    resultsSection.classList.add('hidden');
    loading.classList.remove('hidden');
    
    // Simular delay da busca
    setTimeout(() => {
        performSearch(searchParams);
        loading.classList.add('hidden');
        resultsSection.classList.remove('hidden');
    }, 1000);
}

// Validar parâmetros de busca
function validateSearchParams(params) {
    if (!params.day || !params.month || !params.year || !params.startTime || !params.endTime) {
        showToast('Por favor, preencha todos os campos', 'error');
        return false;
    }
    
    const start = timeToMinutes(params.startTime);
    const end = timeToMinutes(params.endTime);
    
    if (end <= start) {
        showToast('Horário de fim deve ser maior que o de início', 'error');
        return false;
    }
    
    return true;
}

// Realizar busca
function performSearch(params) {
    const { day, month, year, startTime, endTime } = params;
    
    // Determinar dia da semana
    const date = new Date(year, month - 1, day);
    const dayOfWeek = daysOfWeekReverse[date.getDay()];
    
    // Atualizar informações da busca
    updateSearchInfo(params, dayOfWeek);
    
    // Encontrar salas ocupadas neste horário
    const occupiedRooms = findOccupiedRooms(dayOfWeek, startTime, endTime);
    
    // Encontrar salas disponíveis
    const availableRooms = allRooms.filter(room => !occupiedRooms.some(or => or.sala === room));
    
    // Incluir reservas feitas pelo usuário
    const userReservations = findUserReservations(params);
    
    // Renderizar resultados
    renderAvailableRooms(availableRooms);
    renderOccupiedRooms([...occupiedRooms, ...userReservations]);
}

// Atualizar informações da busca
function updateSearchInfo(params, dayOfWeek) {
    const { day, month, year, startTime, endTime } = params;
    const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    
    searchInfo.innerHTML = `
        <strong>Data:</strong> ${dateStr} (${dayOfWeek}) | 
        <strong>Horário:</strong> ${startTime} às ${endTime}
    `;
}

// Encontrar salas ocupadas
function findOccupiedRooms(dayOfWeek, startTime, endTime) {
    const occupied = [];
    const searchStart = timeToMinutes(startTime);
    const searchEnd = timeToMinutes(endTime);
    
    gradeData.forEach(disciplina => {
        disciplina.Horarios.forEach(horario => {
            if (horario.dia === dayOfWeek && horario.sala && horario.sala !== '—') {
                const classStart = timeToMinutes(horario.inicio);
                const classEnd = timeToMinutes(horario.fim);
                
                // Verificar sobreposição de horários
                if (!(searchEnd <= classStart || searchStart >= classEnd)) {
                    occupied.push({
                        sala: horario.sala,
                        disciplina: disciplina.Disciplina,
                        docente: disciplina.Docente,
                        inicio: horario.inicio,
                        fim: horario.fim
                    });
                }
            }
        });
    });
    
    return occupied;
}

// Encontrar reservas do usuário
function findUserReservations(params) {
    const { day, month, year, startTime, endTime } = params;
    const searchStart = timeToMinutes(startTime);
    const searchEnd = timeToMinutes(endTime);
    
    // Garantir que reservations é um array
    if (!Array.isArray(reservations)) {
        console.warn('reservations não é um array, convertendo...');
        reservations = [];
        return [];
    }
    
    console.log('Buscando reservas para:', { day, month, year, startTime, endTime });
    console.log('Total de reservas:', reservations.length);
    
    const filtered = reservations.filter(reservation => {
        if (!reservation || typeof reservation !== 'object') {
            console.warn('Reserva inválida encontrada:', reservation);
            return false;
        }
        
        if (reservation.day === day && 
            reservation.month === month && 
            reservation.year === year) {
            
            const resStart = timeToMinutes(reservation.startTime);
            const resEnd = timeToMinutes(reservation.endTime);
            
            // Verificar sobreposição
            return !(searchEnd <= resStart || searchStart >= resEnd);
        }
        return false;
    });
    
    console.log('Reservas encontradas:', filtered.length);
    return filtered;
}

// Renderizar salas disponíveis
function renderAvailableRooms(rooms) {
    if (rooms.length === 0) {
        availableRoomsList.innerHTML = '<p class="text-center">Nenhuma sala disponível neste horário.</p>';
        return;
    }
    
    availableRoomsList.innerHTML = rooms.map(room => `
        <div class="room-card available" onclick="window.selectRoom('${room}')">
            <div class="room-header">
                <div class="room-name">Sala ${room}</div>
                <div class="room-status status-available">Disponível</div>
            </div>
            <div class="room-info">
                <i class="fas fa-check-circle text-success"></i>
                Clique para reservar esta sala
            </div>
        </div>
    `).join('');
}

// Renderizar salas ocupadas
function renderOccupiedRooms(rooms) {
    if (rooms.length === 0) {
        occupiedRoomsList.innerHTML = '<p class="text-center">Todas as outras salas estão disponíveis.</p>';
        return;
    }
    
    occupiedRoomsList.innerHTML = rooms.map(room => {
        const isUserReservation = room.teacherName !== undefined;
        
        return `
            <div class="room-card occupied">
                <div class="room-header">
                    <div class="room-name">Sala ${room.sala}</div>
                    <div class="room-status status-occupied">Ocupada</div>
                </div>
                <div class="room-info">
                    <strong>Horário:</strong> ${room.inicio || room.startTime} às ${room.fim || room.endTime}<br>
                    <strong>${isUserReservation ? 'Responsável:' : 'Docente:'}</strong> ${room.teacherName || room.docente}<br>
                    <strong>Motivo:</strong> ${room.purpose || room.disciplina}
                    ${isUserReservation ? '<br><span style="color: #667eea;"><i class="fas fa-user"></i> Sua reserva</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Selecionar sala para reserva
function selectRoom(roomName) {
    console.log('Sala selecionada:', roomName);
    if (!currentSearchData) {
        console.error('Dados de busca não encontrados');
        showToast('Erro ao selecionar sala. Por favor, faça uma nova busca.', 'error');
        return;
    }
    
    const { day, month, year, startTime, endTime } = currentSearchData;
    const date = new Date(year, month - 1, day);
    const dayOfWeek = daysOfWeekReverse[date.getDay()];
    const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    
    console.log('Detalhes da reserva:', { roomName, dateStr, dayOfWeek, startTime, endTime });
    
    // Atualizar modal com detalhes da reserva
    document.getElementById('reservationDetails').innerHTML = `
        <div style="background: #f7fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <h4 style="margin-bottom: 0.5rem; color: #2d3748;">Detalhes da Reserva</h4>
            <p><strong>Sala:</strong> ${roomName}</p>
            <p><strong>Data:</strong> ${dateStr} (${dayOfWeek})</p>
            <p><strong>Horário:</strong> ${startTime} às ${endTime}</p>
        </div>
    `;
    
    // Limpar campos do modal
    document.getElementById('reservationPurpose').value = '';
    
    // Armazenar dados da reserva
    confirmModal.dataset.roomName = roomName;
    
    // Mostrar modal
    showModal();
}

// Mostrar modal
function showModal() {
    confirmModal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Fechar modal
function closeModal() {
    confirmModal.classList.add('hidden');
    overlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Função para extrair nome do email
function getNameFromEmail(email) {
    // Pega a parte antes do @ e converte para título (primeira letra maiúscula)
    const name = email.split('@')[0];
    // Substitui pontos e underscores por espaços
    const cleanName = name.replace(/[._]/g, ' ');
    // Converte para título (primeira letra de cada palavra maiúscula)
    return cleanName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Lidar com reserva
async function handleReservation() {
    if (!currentUser) {
        showToast('Por favor, faça login para reservar salas', 'error');
        return;
    }

    const roomName = confirmModal.dataset.roomName;
    const purpose = document.getElementById('reservationPurpose').value.trim();
    
    if (!purpose) {
        showToast('Por favor, preencha o motivo da reserva', 'error');
        return;
    }
    
    // Extrair nome do email do usuário
    const teacherName = getNameFromEmail(currentUser.email);
    
    // Criar reserva
    const reservation = {
        ...currentSearchData,
        sala: roomName,
        purpose,
        teacherName,
        userEmail: currentUser.email,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Salvar no Firebase ou localStorage
        if (firebaseInitialized) {
            await saveToFirebase('reservations', reservation);
        } else {
            reservations.push(reservation);
            await saveReservations();
        }
        
        // Adicionar à lista local para exibição imediata
        reservations.push(reservation);
        
        // Fechar modal
        closeModal();
        
        // Mostrar confirmação
        showToast(`Sala ${roomName} reservada com sucesso!`, 'success');
        
        // Atualizar resultados da busca
        performSearch(currentSearchData);
        
    } catch (error) {
        console.error('Erro ao salvar reserva:', error);
        showToast('Erro ao salvar reserva. Tente novamente.', 'error');
    }
}

// Mostrar toast
function showToast(message, type = 'success') {
    const toastElement = document.getElementById('toast');
    const messageElement = document.getElementById('toastMessage');
    
    messageElement.textContent = message;
    toastElement.className = `toast ${type}`;
    toastElement.classList.remove('hidden');
    
    // Auto-hide após 5 segundos
    setTimeout(hideToast, 5000);
}

// Esconder toast
function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}

// Função utilitária para debug
function debugApp() {
    console.log('=== DEBUG INFO ===');
    console.log('Grade Data:', gradeData.length, 'disciplinas');
    console.log('All Rooms:', allRooms);
    console.log('Reservations:', reservations);
    console.log('Current Search:', currentSearchData);
}

// Adicionar função de debug ao window para facilitar desenvolvimento
window.debugApp = debugApp; 
