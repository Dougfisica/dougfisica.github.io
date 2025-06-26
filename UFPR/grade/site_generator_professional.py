# ===============================================================
# GERADOR DE SITE PROFISSIONAL - GRADE UFPR
# Versão melhorada com UX/UI profissional
# ===============================================================

import pandas as pd
import json
from pathlib import Path
from datetime import date

# Configurações
CURSO_COL, SEMESTRE_COL = "Curso", "Semestre"
DISC_COL, DOC_COL = "Disciplina", "Docente"
DIA_COL, INI_COL, FIM_COL, SALA_COL = "Dia", "Início", "Fim", "Sala"

hoje = date.today().strftime("%d/%m/%Y")

# Carregamento e processamento dos dados
print("📊 Carregando dados...")
df = pd.read_csv("2025_2s_grade.csv", encoding="utf-8-sig")

# Preenchimento de dados de docente
df[DOC_COL] = (df.groupby([DISC_COL, SEMESTRE_COL])[DOC_COL]
                 .transform(lambda s: s.ffill().bfill()))

# Agrupamento e processamento
dup_key = [DISC_COL, SEMESTRE_COL, DIA_COL, INI_COL, FIM_COL]

def squash(g):
    row = g.iloc[0].copy()
    row[SALA_COL] = g[SALA_COL].dropna().iloc[0] if g[SALA_COL].notna().any() else pd.NA
    row[DOC_COL] = g[DOC_COL].dropna().iloc[0] if g[DOC_COL].notna().any() else ""
    row[CURSO_COL] = sorted(set(g[CURSO_COL]))
    return row

df_hor = (df.groupby(dup_key, as_index=False, sort=False)
            .apply(squash, include_groups=False).reset_index(drop=True))

df_hor["CursosKey"] = df_hor[CURSO_COL].apply(tuple)

def turma(g):
    return pd.Series({
        "Cursos": list(g[CURSO_COL].iloc[0]),
        "Horarios": g.apply(lambda r: {
            "dia": r[DIA_COL], "inicio": r[INI_COL],
            "fim": r[FIM_COL], "sala": r[SALA_COL] if pd.notna(r[SALA_COL]) else "—"
        }, axis=1).tolist(),
        "Docente": g[DOC_COL].iloc[0] or "—"
    })

agg = (df_hor.groupby([DISC_COL, SEMESTRE_COL, "CursosKey"], as_index=False)
              .apply(turma, include_groups=False))

records = [dict(Disciplina=r[DISC_COL], Semestre=r[SEMESTRE_COL],
                Cursos=r["Cursos"], Horarios=r["Horarios"], Docente=r["Docente"])
           for _, r in agg.iterrows()]

json_data = json.dumps(records, ensure_ascii=False)

print("🎨 Gerando site profissional...")

# Template HTML profissional e moderno
html_template = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grade de Disciplinas UFPR | 2º Semestre 2025</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Fira+Code:wght@300;400;500&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            /* Modern Color Palette */
            --primary: #2563eb;
            --primary-light: #3b82f6;
            --primary-dark: #1d4ed8;
            --secondary: #f59e0b;
            --accent: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --success: #10b981;
            
            /* Neutral Colors */
            --gray-50: #f9fafb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-300: #d1d5db;
            --gray-400: #9ca3af;
            --gray-500: #6b7280;
            --gray-600: #4b5563;
            --gray-700: #374151;
            --gray-800: #1f2937;
            --gray-900: #111827;
            
            /* Semantic Colors */
            --bg-primary: #ffffff;
            --bg-secondary: var(--gray-50);
            --text-primary: var(--gray-900);
            --text-secondary: var(--gray-600);
            --border: var(--gray-200);
            --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
            
            /* Sizes */
            --radius: 12px;
            --radius-sm: 8px;
            --radius-lg: 16px;
            --container-width: 1400px;
        }
        
        [data-theme="dark"] {
            --bg-primary: var(--gray-900);
            --bg-secondary: var(--gray-800);
            --text-primary: var(--gray-100);
            --text-secondary: var(--gray-400);
            --border: var(--gray-700);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
            transition: all 0.3s ease;
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 0.5rem 0;
            box-shadow: var(--shadow-lg);
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            animation: float 20s linear infinite;
        }
        
        @keyframes float {
            0% { transform: translateX(0px); }
            100% { transform: translateX(60px); }
        }
        
        .header-content {
            max-width: var(--container-width);
            margin: 0 auto;
            padding: 0 2rem;
            position: relative;
            z-index: 1;
        }
        
        .header h1 {
            font-size: clamp(1rem, 3vw, 1.5rem);
            font-weight: 700;
            margin: 0 0 0.25rem 0;
            background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: block;
        }
        
        .header .subtitle {
            font-size: 0.8rem;
            opacity: 0.9;
            display: block;
            margin: 0;
        }
        
        .theme-toggle {
            position: absolute;
            top: 1rem;
            right: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 0.75rem;
            border-radius: var(--radius);
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        
        .theme-toggle:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
        }
        
        /* Container */
        .container {
            max-width: var(--container-width);
            margin: 0 auto;
            padding: 2rem;
        }
        
        /* Filters */
        .filters-section {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }
        
        .filters-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }
        
        .filters-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .filters-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .search-container {
            position: relative;
            grid-column: 1 / -1;
        }
        
        .search-container i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
        }
        
        .filter-help {
            background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
            border: 1px solid #0ea5e9;
            border-radius: var(--radius);
            padding: 0.75rem 1rem;
            margin-top: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #0369a1;
            font-size: 0.9rem;
        }
        
        .filter-help i {
            color: #0ea5e9;
        }
        
        [data-theme="dark"] .filter-help {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            border-color: #3b82f6;
            color: #bfdbfe;
        }
        
        [data-theme="dark"] .filter-help i {
            color: #60a5fa;
        }
        
        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .filter-label {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        select, input[type="search"] {
            background: var(--bg-secondary);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            padding: 0.875rem 1rem;
            font-size: 0.95rem;
            color: var(--text-primary);
            transition: all 0.3s ease;
            font-family: inherit;
            width: 100%;
        }
        
        input[type="search"] {
            padding-left: 2.75rem;
            text-align: center;
        }
        
        input[type="search"]:focus {
            text-align: left;
        }
        
        select:focus, input[type="search"]:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
            transform: translateY(-1px);
        }
        
        select:hover, input[type="search"]:hover {
            border-color: var(--primary-light);
        }
        
        /* Results Summary */
        .results-summary {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: var(--bg-primary);
            border-radius: var(--radius);
            border: 1px solid var(--border);
        }
        
        .results-count {
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .view-toggle {
            display: flex;
            gap: 0.5rem;
            width: 100%;
        }
        
        .view-btn {
            flex: 1;
            padding: 0.75rem 1rem;
            border: 1px solid var(--border);
            background: var(--bg-secondary);
            color: var(--text-secondary);
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.875rem;
            text-align: center;
        }
        
        .view-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        
        /* Grid Layout */
        .disciplines-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 1.5rem;
        }
        
        /* Card */
        .discipline-card {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .discipline-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-xl);
            border-color: var(--primary-light);
        }
        
        .discipline-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
        }
        
        .card-header {
            margin-bottom: 1rem;
        }
        
        .discipline-name {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            line-height: 1.4;
        }
        
        .card-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }
        
        .badge-semester {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white;
        }
        
        .badge-course {
            background: var(--gray-100);
            color: var(--gray-700);
            border: 1px solid var(--gray-200);
        }
        
        .badge-professor {
            background: linear-gradient(135deg, var(--accent), #059669);
            color: white;
        }
        
        [data-theme="dark"] .badge-course {
            background: var(--gray-800);
            color: var(--gray-300);
            border-color: var(--gray-700);
        }
        
        .schedules-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .schedule-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: var(--bg-secondary);
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
        }
        
        .schedule-day {
            font-weight: 600;
            color: var(--primary);
            min-width: 60px;
        }
        
        .schedule-time {
            font-family: 'Fira Code', monospace;
            color: var(--text-secondary);
            min-width: 100px;
        }
        
        .schedule-room {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            color: var(--text-primary);
            font-weight: 500;
        }
        
        /* Calendar */
        .calendar-section {
            margin-top: 2rem;
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            padding: 2rem;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            overflow-x: auto;
            width: 100%;
        }
        
        .calendar-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }
        
        .calendar-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .calendar-grid {
            display: grid;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            width: max-content;
            min-width: 100%;
        }
        
        .calendar-cell {
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            font-size: 0.8rem;
        }
        
        .calendar-hour {
            background: var(--bg-secondary);
            justify-content: flex-end;
            padding-right: 0.5rem;
            font-weight: 600;
            font-family: 'Fira Code', monospace;
        }
        
        .calendar-day-header {
            background: var(--primary);
            color: white;
            font-weight: 700;
            justify-content: center;
            padding: 0.75rem;
        }
        
        .calendar-event {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            z-index: 2;
            margin: 1px;
            font-weight: 500;
            line-height: 1.1;
            min-height: 100%;
            box-sizing: border-box;
        }
        
        .event-name {
            font-weight: 600;
            margin-bottom: 0.1rem;
            line-height: 1;
            text-align: center;
            white-space: normal;
        }
        
        .event-room {
            font-size: 0.75em;
            opacity: 0.9;
            font-weight: 400;
            line-height: 1;
            text-align: center;
            white-space: normal;
        }
        
        .conflicts-alert {
            background: linear-gradient(135deg, var(--danger), #dc2626);
            color: white;
            padding: 1rem;
            border-radius: var(--radius);
            margin-top: 1rem;
            font-weight: 600;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header {
                padding: 1rem 0;
            }
            
            .header h1 {
                font-size: 1.5rem;
                margin-bottom: 0;
            }
            
            .header .subtitle {
                font-size: 0.9rem;
                margin-top: 0.25rem;
            }
            
            .filters-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .disciplines-grid {
                grid-template-columns: 1fr;
            }
            
            .theme-toggle {
                position: static;
                margin-top: 1rem;
            }
            
            .results-summary {
                padding: 0.75rem;
            }
            
            .view-btn {
                padding: 0.6rem 0.8rem;
                font-size: 0.8rem;
            }
        }
        
        @media (max-width: 480px) {
            .filters-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .header h1 {
                font-size: 1.25rem;
            }
            
            .header .subtitle {
                font-size: 0.8rem;
            }
            
            .calendar-section {
                padding: 1rem;
                overflow-x: auto;
            }
            
            .calendar-grid {
                min-width: 400px;
                width: max-content;
            }
            
            .calendar-cell {
                font-size: 0.7rem;
                min-width: 50px;
                white-space: nowrap;
            }
            
            .calendar-hour {
                min-width: 50px;
                padding-right: 0.25rem;
                font-size: 0.65rem;
            }
            
            .calendar-day-header {
                padding: 0.5rem 0.25rem;
                min-width: 50px;
                font-size: 0.75rem;
            }
            
            .calendar-event {
                font-size: 0.6rem;
                padding: 0.1rem 0.2rem;
            }
            
            .event-name {
                font-size: 0.55rem;
                line-height: 1;
                margin-bottom: 0.05rem;
                text-align: center;
                white-space: normal;
            }
            
            .event-room {
                font-size: 0.6rem;
                line-height: 1;
                text-align: center;
                white-space: normal;
            }
            
            select, input[type="search"] {
                padding: 0.6rem 0.8rem;
                font-size: 0.85rem;
            }
            
            .filter-help {
                padding: 0.6rem 0.8rem;
                font-size: 0.8rem;
            }
        }
        
        /* Loading Animation */
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 3rem;
            color: var(--text-secondary);
        }
        
        .spinner {
            border: 3px solid var(--border);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-right: 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Fade in animation */
        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
        
        /* Print styles */
        @media print {
            .filters-section, .theme-toggle, .view-toggle {
                display: none;
            }
            
            .discipline-card {
                break-inside: avoid;
                box-shadow: none;
                border: 1px solid #000;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <button class="theme-toggle" onclick="toggleTheme()" title="Alternar tema">
            <i class="fas fa-moon" id="theme-icon"></i>
        </button>
        <div class="header-content">
            <h1><i class="fas fa-graduation-cap"></i> Grade de Disciplinas UFPR</h1>
            <p class="subtitle">
                <i class="fas fa-calendar-alt"></i>
                2º Semestre 2025 • Atualizado em ##DATE##
            </p>
        </div>
    </header>

    <div class="container">
        <section class="filters-section">
            <div class="filters-header">
                <i class="fas fa-filter"></i>
                <h2>Filtros</h2>
            </div>
            
            <div class="filters-grid">
                <div class="filter-group">
                    <label class="filter-label" for="curso">
                        <i class="fas fa-users"></i> Curso
                    </label>
                    <select id="curso">
                        <option value="">Todos os cursos</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label" for="semestre">
                        <i class="fas fa-layer-group"></i> Semestre
                    </label>
                    <select id="semestre">
                        <option value="">Todos os semestres</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label" for="docente">
                        <i class="fas fa-chalkboard-teacher"></i> Docente
                    </label>
                    <select id="docente">
                        <option value="">Todos os docentes</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label" for="sala">
                        <i class="fas fa-door-open"></i> Sala
                    </label>
                    <select id="sala">
                        <option value="">Todas as salas</option>
                        <option value="_check">🔍 Verificar conflitos</option>
                    </select>
                </div>
                
                <div class="search-container">
                    <i class="fas fa-search"></i>
                    <input type="search" id="busca" placeholder="Buscar disciplina...">
                </div>
            </div>
            
            <div class="filter-help" id="filter-help">
                <i class="fas fa-info-circle"></i>
                <span>Selecione um <strong>Curso</strong> e <strong>Semestre</strong> para ver as disciplinas disponíveis</span>
            </div>
        </section>

        <div class="results-summary">
            <div class="view-toggle">
                <button class="view-btn active" onclick="setView('calendar')" id="calendar-btn">
                    <i class="fas fa-calendar-week"></i> Grade
                </button>
                <button class="view-btn" onclick="setView('grid')" id="grid-btn">
                    <i class="fas fa-list"></i> Disciplinas
                </button>
            </div>
        </div>

        <section class="calendar-section" id="calendar-section" style="display: none;">
            <div class="calendar-grid" id="calendar-grid"></div>
            <div id="conflicts-container"></div>
        </section>

        <div id="disciplines-container">
            <div class="loading" id="loading">
                <div class="spinner"></div>
                Carregando disciplinas...
            </div>
            <div class="disciplines-grid" id="disciplines-list"></div>
        </div>
    </div>

    <script>
        // Dados das disciplinas
        const data = ##DATA##;
        
        // Elementos DOM
        const $ = selector => document.querySelector(selector);
        const $$ = selector => document.querySelectorAll(selector);
        
        const cursoSel = $('#curso');
        const semSel = $('#semestre');
        const docSel = $('#docente');
        const salaSel = $('#sala');
        const buscaInput = $('#busca');
        const disciplinesList = $('#disciplines-list');
        const calendarSection = $('#calendar-section');
        const calendarGrid = $('#calendar-grid');
        const conflictsContainer = $('#conflicts-container');
        const loading = $('#loading');
        const filterHelp = $('#filter-help');
        
        let currentView = 'calendar';
        let filteredData = [];
        
        // Inicialização
        function initSite() {
            populateFilters();
            render();
            // Oculta o spinner de carregamento após breve atraso
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }

        // Se o DOM já estiver pronto, executa imediatamente; caso contrário, aguarda o evento
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initSite);
        } else {
            initSite();
        }
        
        // Popular filtros
        function populateFilters() {
            const cursos = [...new Set(data.flatMap(d => d.Cursos))].sort();
            const semestres = [...new Set(data.map(d => d.Semestre))].sort((a, b) => a - b);
            const docentes = [...new Set(data.map(d => d.Docente).filter(d => d && d !== '—'))].sort();
            const salas = [...new Set(data.flatMap(d => d.Horarios.map(h => h.sala)).filter(s => s && s !== '—'))].sort();
            
            cursos.forEach(c => cursoSel.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));
            semestres.forEach(s => semSel.insertAdjacentHTML('beforeend', `<option value="${s}">${s}º Semestre</option>`));
            docentes.forEach(d => docSel.insertAdjacentHTML('beforeend', `<option value="${d}">${d}</option>`));
            salas.forEach(s => salaSel.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`));
        }
        
        // Event listeners
        [cursoSel, semSel, docSel, salaSel].forEach(el => el.addEventListener('change', render));
        buscaInput.addEventListener('input', debounce(render, 300));
        
        // Debounce function
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // Render principal
        function render() {
            const filters = {
                curso: cursoSel.value,
                semestre: semSel.value,
                docente: docSel.value,
                sala: salaSel.value,
                busca: buscaInput.value.toLowerCase()
            };
            
            // Aplicar filtros
            filteredData = data.filter(discipline => {
                const matchCurso = !filters.curso || discipline.Cursos.includes(filters.curso);
                const matchSemestre = !filters.semestre || discipline.Semestre == filters.semestre;
                const matchDocente = !filters.docente || discipline.Docente === filters.docente;
                const matchSala = !filters.sala || filters.sala === '_check' || 
                                 discipline.Horarios.some(h => h.sala === filters.sala);
                const matchBusca = !filters.busca || 
                                 discipline.Disciplina.toLowerCase().includes(filters.busca);
                
                return matchCurso && matchSemestre && matchDocente && matchSala && matchBusca;
            });
            
            // Contador removido
            
            // Mostrar/esconder mensagem de ajuda
            const hasMainFilters = filters.curso || filters.semestre;
            filterHelp.style.display = hasMainFilters ? 'none' : 'flex';
            
            // Verificar conflitos
            if (filters.sala === '_check') {
                showConflicts();
                return;
            }
            
            // Renderizar baseado na view atual
            if (currentView === 'grid') {
                renderGrid();
                calendarSection.style.display = 'none';
                $('#disciplines-container').style.display = 'block';
            } else {
                renderCalendar();
                calendarSection.style.display = 'block';
                $('#disciplines-container').style.display = 'none';
            }
        }
        
        // Renderizar grid de disciplinas
        function renderGrid() {
            if (filteredData.length === 0) {
                disciplinesList.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <h3>Nenhuma disciplina encontrada</h3>
                        <p>Tente ajustar os filtros para encontrar disciplinas.</p>
                    </div>
                `;
                return;
            }
            
            disciplinesList.innerHTML = filteredData.map(discipline => `
                <div class="discipline-card fade-in">
                    <div class="card-header">
                        <h3 class="discipline-name">${discipline.Disciplina}</h3>
                        <div class="card-meta">
                            <span class="badge badge-semester">
                                <i class="fas fa-layer-group"></i>
                                ${discipline.Semestre}º Sem
                            </span>
                            <span class="badge badge-course">
                                <i class="fas fa-users"></i>
                                ${discipline.Cursos.join(', ')}
                            </span>
                            <span class="badge badge-professor">
                                <i class="fas fa-chalkboard-teacher"></i>
                                ${discipline.Docente}
                            </span>
                        </div>
                    </div>
                    
                    <div class="schedules-list">
                        ${discipline.Horarios.map(h => `
                            <div class="schedule-item">
                                <span class="schedule-day">${h.dia.slice(0, 3)}</span>
                                <span class="schedule-time">${h.inicio}–${h.fim}</span>
                                <span class="schedule-room">
                                    <i class="fas fa-door-open"></i>
                                    ${h.sala}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
        
        // Função para formatar nome da disciplina (uma palavra por linha)
        function formatNameForCalendar(fullName) {
            // Remove código da disciplina (ex: "BIAES004 - Nome" -> "Nome")
            const name = fullName.includes(' - ') ? fullName.split(' - ').slice(1).join(' - ') : fullName;
            
            const words = name.split(' ');
            
            // Se for uma palavra só, mantém como está
            if (words.length === 1) {
                return words[0].length > 12 ? words[0].substring(0, 12) + '...' : words[0];
            }
            
            // Para múltiplas palavras, abrevia e separa por quebra de linha
            const abbreviatedWords = words.map(word => {
                if (word.length <= 3) return word; // Palavras pequenas ficam inteiras
                if (['DE', 'DA', 'DO', 'E', 'EM', 'PARA', 'COM', 'II', 'III', 'IV'].includes(word.toUpperCase())) return word;
                return word.length > 8 ? word.substring(0, 8) + '.' : word;
            });
            
            // Junta as palavras com quebra de linha
            return abbreviatedWords.join('<br>');
        }

        // Renderizar calendário
        function renderCalendar() {
            // Verificar se algum filtro foi aplicado
            const hasFilters = cursoSel.value || semSel.value || docSel.value || salaSel.value || buscaInput.value;
            
            if (!hasFilters || filteredData.length === 0) {
                calendarGrid.innerHTML = '';
                return;
            }
            
            const toMinutes = time => {
                const [h, m] = time.split(':').map(Number);
                return h * 60 + m;
            };
            
            // Encontrar horários mín/máx
            let minTime = Infinity, maxTime = -Infinity;
            filteredData.forEach(d => {
                d.Horarios.forEach(h => {
                    minTime = Math.min(minTime, toMinutes(h.inicio));
                    maxTime = Math.max(maxTime, toMinutes(h.fim));
                });
            });
            
            minTime = Math.floor(minTime / 30) * 30;
            maxTime = Math.ceil(maxTime / 30) * 30;
            
            const rows = (maxTime - minTime) / 30;
            const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
            const dayMapping = { Segunda: 'Seg', Terça: 'Ter', Quarta: 'Qua', Quinta: 'Qui', Sexta: 'Sex' };
            
            // Ajustar colunas baseado no tamanho da tela
            const isMobile = window.innerWidth <= 480;
            calendarGrid.style.gridTemplateColumns = isMobile ? '50px repeat(5, 50px)' : '80px repeat(5, 1fr)';
            calendarGrid.style.gridTemplateRows = `auto repeat(${rows}, 30px)`;
            
            // Cabeçalho
            let html = '<div></div>' + dias.map(d => `<div class="calendar-cell calendar-day-header">${d}</div>`).join('');
            
            // Horas e slots
            for (let i = 0; i < rows; i++) {
                const minutes = minTime + i * 30;
                const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
                const min = (minutes % 60).toString().padStart(2, '0');
                html += `<div class="calendar-cell calendar-hour" style="grid-row: ${i + 2}">${hour}:${min}</div>`;
                html += '<div class="calendar-cell"></div>'.repeat(5);
            }
            
            // Eventos
            filteredData.forEach(discipline => {
                discipline.Horarios.forEach(h => {
                    const dayIndex = dias.indexOf(dayMapping[h.dia]);
                    if (dayIndex === -1) return;
                    
                    const startRow = Math.floor((toMinutes(h.inicio) - minTime) / 30) + 2;
                    const endRow = Math.floor((toMinutes(h.fim) - minTime) / 30) + 2;
                    const col = dayIndex + 2;
                    
                    html += `
                        <div class="calendar-cell calendar-event" 
                             style="grid-column: ${col}; grid-row: ${startRow} / ${endRow}"
                             title="${discipline.Disciplina} - ${h.sala} - ${discipline.Docente}">
                            <div class="event-name">${formatNameForCalendar(discipline.Disciplina)}</div>
                            <div class="event-room">${h.sala}</div>
                        </div>
                    `;
                });
            });
            
            calendarGrid.innerHTML = html;
        }
        
        // Mostrar conflitos
        function showConflicts() {
            calendarSection.style.display = 'block';
            disciplinesList.innerHTML = '';
            
            const conflicts = {};
            const toMinutes = time => {
                const [h, m] = time.split(':').map(Number);
                return h * 60 + m;
            };
            
            data.forEach(discipline => {
                discipline.Horarios.forEach(h => {
                    for (let m = toMinutes(h.inicio); m < toMinutes(h.fim); m += 30) {
                        const key = `${h.sala}|${h.dia}|${m}`;
                        if (!conflicts[key]) conflicts[key] = [];
                        conflicts[key].push(discipline.Disciplina);
                    }
                });
            });
            
            const conflictList = Object.entries(conflicts)
                .filter(([key, disciplines]) => disciplines.length > 1)
                .map(([key, disciplines]) => {
                    const [sala, dia, minutes] = key.split('|');
                    const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
                    const min = (minutes % 60).toString().padStart(2, '0');
                    return `
                        <div style="margin-bottom: 0.5rem;">
                            <strong>${dia} ${hour}:${min} - Sala ${sala}:</strong><br>
                            ${[...new Set(disciplines)].join(' × ')}
                        </div>
                    `;
                });
            
            calendarGrid.innerHTML = '';
            conflictsContainer.innerHTML = conflictList.length ? 
                `<div class="conflicts-alert">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Conflitos encontrados:</strong><br><br>
                    ${conflictList.join('')}
                </div>` :
                `<div style="padding: 2rem; text-align: center; color: var(--success);">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h3>Nenhum conflito encontrado!</h3>
                    <p>Todas as salas estão disponíveis nos horários marcados.</p>
                </div>`;
        }
        
        // Alternar view
        function setView(view) {
            currentView = view;
            $('#grid-btn').classList.toggle('active', view === 'grid');
            $('#calendar-btn').classList.toggle('active', view === 'calendar');
            render();
        }
        
        // Alternar tema
        function toggleTheme() {
            const body = document.body;
            const icon = $('#theme-icon');
            
            if (body.hasAttribute('data-theme')) {
                body.removeAttribute('data-theme');
                icon.className = 'fas fa-moon';
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                icon.className = 'fas fa-sun';
                localStorage.setItem('theme', 'dark');
            }
        }
        
        // Carregar tema salvo
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            $('#theme-icon').className = 'fas fa-sun';
        }
    </script>
</body>
</html>"""

# Substituir dados e data
html_final = html_template.replace("##DATA##", json_data).replace("##DATE##", hoje)

# Salvar arquivo
output_file = "index.html"
Path(output_file).write_text(html_final, encoding="utf-8")

print(f"✅ Site profissional gerado com sucesso!")
print(f"📁 Arquivo: {output_file}")