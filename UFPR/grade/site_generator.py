import pandas as pd
import streamlit as st

# Lê o arquivo CSV
csv_path = '2025_2s_grade.csv'
df = pd.read_csv(csv_path)

# Sidebar para filtros
st.sidebar.title('Filtros')
cursos = df['Curso'].unique()
curso_escolhido = st.sidebar.selectbox('Escolha o curso:', sorted(cursos))
semestres = df[df['Curso'] == curso_escolhido]['Semestre'].unique()
semestre_escolhido = st.sidebar.selectbox('Escolha o semestre:', sorted(semestres))

# Filtra dataframe
df_filtrado = df[(df['Curso'] == curso_escolhido) & (df['Semestre'] == semestre_escolhido)]

# CSS Customizado inspirado no seu layout
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Roboto:wght@400;500&display=swap');
    body {background: #f8fafc;}
    .main {background: #f8fafc;}
    h1 {color: #1e40af; font-family: 'Montserrat', sans-serif; font-size: 2.5rem; font-weight: 700;}
    .subtitle {font-size: 1.25rem; color: #64748b; max-width: 600px; margin: 0 auto;}
    .curso-card {
        background: #fff;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        border: 1px solid #e2e8f0;
        margin-bottom: 1.5rem;
        font-family: 'Roboto', sans-serif;
        position: relative;
        overflow: hidden;
    }
    .curso-card-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1e40af;
        margin-bottom: 0.5rem;
    }
    .curso-card-info {
        color: #64748b;
        font-size: 1rem;
        margin-bottom: 0.25rem;
    }
    .curso-card-extra {
        color: #1e293b;
        font-size: 1rem;
    }
    </style>
""", unsafe_allow_html=True)

# Título e subtítulo
st.markdown("<h1>Grade dos Cursos - UFPR</h1>", unsafe_allow_html=True)
st.markdown("<div class='subtitle'>Filtre a grade curricular por curso e semestre. Inspirado por Doug Física.</div>", unsafe_allow_html=True)
st.write("")

# Exibe cards das disciplinas filtradas
for _, row in df_filtrado.iterrows():
    st.markdown(f"""
        <div class="curso-card">
            <div class="curso-card-title">{row['Disciplina']}</div>
            <div class="curso-card-info"><b>Dia:</b> {row['Dia']} | <b>Horário:</b> {row['Início']} - {row['Fim']}</div>
            <div class="curso-card-info"><b>Sala:</b> {row['Sala']}</div>
            <div class="curso-card-extra"><b>Docente:</b> {row['Docente']}</div>
        </div>
    """, unsafe_allow_html=True)
