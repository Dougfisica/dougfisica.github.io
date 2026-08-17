(() => {
    const aulasQuarta = [
        ["05/AGO", "Sistema Internacional", ""],
        ["12/AGO", "Cancelada", "cancelada"],
        ["19/AGO", "Gráficos", ""],
        ["26/AGO", "Aceleração Constante", ""],
        ["02/SET", "Aceleração Constante", ""],
        ["09/SET", "Exercícios", ""],
        ["16/SET", "Vetores", ""],
        ["23/SET", "Movimento em 2D e 3D", ""],
        ["30/SET", "Força", ""],
        ["07/OUT", "Atrito e Exercícios", ""],
        ["14/OUT", "Exercícios", ""],
        ["21/OUT", "SIEPE", "feriado"],
        ["28/OUT", "Dia do Servidor", "feriado"],
        ["04/NOV", "Energia", ""],
        ["11/NOV", "Energia", ""],
        ["18/NOV", "Centro de Massa e Momento Linear", ""],
        ["25/NOV", "Impulso e Colisões", ""],
        ["02/DEZ", "Exercícios", ""]
    ];

    const aulasSexta = [
        ["07/AGO", "Movimento em 1D", ""],
        ["14/AGO", "Cancelada", "cancelada"],
        ["21/AGO", "Gráficos", "gravacao"],
        ["28/AGO", "Aceleração Constante", ""],
        ["04/SET", "Aceleração Constante", "gravacao"],
        ["11/SET", "Prova 1", "prova"],
        ["18/SET", "Movimento em 2D e 3D", ""],
        ["25/SET", "Dinâmica da Partícula", "gravacao"],
        ["02/OUT", "Força", ""],
        ["09/OUT", "Atrito e Exercícios", "gravacao"],
        ["16/OUT", "Prova 2", "prova"],
        ["23/OUT", "SIEPE", "feriado"],
        ["30/OUT", "Energia", ""],
        ["06/NOV", "Energia", "gravacao"],
        ["13/NOV", "Centro de Massa e Momento Linear", ""],
        ["20/NOV", "Feriado", "feriado"],
        ["27/NOV", "Impulso e Colisões", "gravacao"],
        ["04/DEZ", "Prova 3", "prova"]
    ];

    const rotulos = {
        cancelada: "AULA CANCELADA",
        gravacao: "GRAVAÇÃO",
        prova: "PROVA",
        feriado: "SEM AULA"
    };

    function renderizarAulas(container, aulas) {
        container.innerHTML = aulas.map(([data, assunto, tipo]) => `
            <div class="aula-item${tipo ? ` ${tipo}` : ""}">
                <div class="aula-data">${data}</div>
                <div class="aula-assunto">${assunto}</div>
                ${tipo ? `<span class="aula-rotulo">${rotulos[tipo]}</span>` : ""}
            </div>
        `).join("");
    }

    const colunas = document.querySelectorAll(".day-content");
    if (colunas.length >= 2) {
        renderizarAulas(colunas[0], aulasQuarta);
        renderizarAulas(colunas[1], aulasSexta);
    }

    document.querySelectorAll(".exame-data").forEach((elemento) => {
        elemento.textContent = "11/DEZ";
    });
})();
