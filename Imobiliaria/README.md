# Monitor de casas para alugar em Jandaia do Sul

Consulta quatro imobiliárias, mantém um histórico local e avisa quando surgir uma **casa em Jandaia do Sul**, para **aluguel** e com valor **acima de R$ 2.000**:

- [Hashimoto Corretor de Imóveis](https://hashimotocorretordeimoveis.com.br/imovel/alugar)
- [Imobivale Imóveis](https://www.imobivaleimoveis.com.br/)
- [JOL Negócios Imobiliários](https://www.jolnegociosimobiliarios.com.br/imovel/?tipo=casa&finalidade=locacao&cidade=jandaia-do-sul)
- [Ideal Maringá Imóveis](https://idealimoveismga.com.br/imoveis/locacao/residenciais/23-jandaia-do-sul-pr)

O programa usa somente a biblioteca padrão do Python. Ele consulta as APIs públicas utilizadas pelos portais ou os dados estruturados das próprias páginas de resultados.

## Teste inicial

```bash
chmod +x executar_monitor.sh
./executar_monitor.sh
```

Na primeira execução, os anúncios que já existem são gravados em `estado_imoveis.json`, sem gerar alertas retroativos. Quando uma nova imobiliária é adicionada ao programa, seus anúncios atuais também viram uma linha de base. Para alertar todos os anúncios ainda não registrados:

```bash
./executar_monitor.sh --alertar-existentes
```

## Receber o alerta

Sem configuração, os avisos aparecem no terminal. Para receber por Telegram e/ou e-mail, copie o exemplo e preencha o canal desejado:

```bash
cp .env.exemplo .env
```

O arquivo `.env` é carregado automaticamente por `executar_monitor.sh`. Não o compartilhe, pois contém credenciais.

### Telegram

1. Converse com `@BotFather`, crie um bot e copie o token para `TELEGRAM_BOT_TOKEN`.
2. Envie uma mensagem ao bot.
3. Abra `https://api.telegram.org/botSEU_TOKEN/getUpdates` e copie o valor de `chat.id` para `TELEGRAM_CHAT_ID`.

### E-mail

Preencha `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` e `EMAIL_TO`. No Gmail, use uma senha de aplicativo, não a senha normal da conta.

## Executar uma vez por dia

Há duas opções. Para deixar o processo aberto continuamente:

```bash
./executar_monitor.sh --loop
```

Para usar o `cron` do Linux (mais resistente a reinicializações), execute `crontab -e` e acrescente uma linha como esta, ajustando o caminho se necessário:

```cron
0 9 * * * /media/douglas/Disco1/codex/Imobiliaria/executar_monitor.sh >> /media/douglas/Disco1/codex/Imobiliaria/monitor.log 2>&1
```

Esse exemplo verifica todos os dias às 09:00 no fuso horário do computador.

## Opções úteis

```bash
./executar_monitor.sh --help
./executar_monitor.sh --valor 2500
./executar_monitor.sh --loop --intervalo 86400
```

O histórico fica em `estado_imoveis.json`. Apagá-lo faz a próxima execução criar uma nova linha de base.

## Painel HTML

Você também pode abrir o arquivo `Abrir Radar de Casas.desktop`. Ele inicia o servidor e abre o painel automaticamente. Dependendo do gerenciador de arquivos, no primeiro uso pode ser necessário clicar com o botão direito e escolher **Permitir iniciar** ou **Confiar e executar**.

Para usar a interface com o botão **Verificar agora**, execute:

```bash
chmod +x executar_painel.sh
./executar_painel.sh
```

O navegador será aberto automaticamente em [http://127.0.0.1:8000](http://127.0.0.1:8000). Mantenha o terminal do painel aberto durante o uso. O painel usa o mesmo histórico do monitor diário, mostra a quantidade encontrada em cada imobiliária e exibe cartões com os novos anúncios.

Não abra o `index.html` sozinho: o botão precisa do servidor iniciado por `executar_painel.sh`. Caso a página já esteja aberta, inicie o servidor e clique novamente em **Verificar agora**.

Para escolher outra porta:

```bash
./executar_painel.sh --porta 8080
```

## Usar no GitHub Pages

O repositório inclui um workflow manual em
`.github/workflows/atualizar-site.yml`. O GitHub Pages mostra o painel, e o
GitHub Actions executa o monitor Python somente quando você solicitar. Não há
agendamento automático.

### Publicar pela primeira vez

1. Envie esta pasta para um repositório independente no GitHub.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment → Source**, escolha **GitHub Actions**.
4. Abra **Actions → Atualizar radar e publicar Pages**.
5. Clique em **Run workflow** e confirme em **Run workflow**.
6. Ao terminar, o endereço do site aparecerá no resumo da execução e em
   **Settings → Pages**.

No site publicado, o botão **Verificar agora** abre essa mesma tela do workflow.
Depois de confirmar **Run workflow**, o Actions consulta as quatro imobiliárias,
salva o histórico, atualiza `dados.json` e republica o painel. Essa confirmação
no GitHub é necessária para que nenhuma chave de acesso fique exposta no código
público do Pages.

### Alertas opcionais no GitHub

Para receber Telegram ou e-mail, abra **Settings → Secrets and variables →
Actions**, clique em **New repository secret** e cadastre os mesmos nomes
mostrados em `.env.exemplo`. Para Telegram, por exemplo:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Não envie o arquivo `.env` ao repositório. Os valores cadastrados como Secrets
são entregues somente à execução do GitHub Actions.

### Permissão para salvar o histórico

O workflow precisa gravar `dados.json` e `estado_pages.json` depois de cada
consulta. Se a execução mostrar erro de permissão ao fazer `git push`, abra
**Settings → Actions → General → Workflow permissions**, selecione **Read and
write permissions** e salve. O arquivo `estado_pages.json` contém apenas IDs já
vistos e informações da consulta; credenciais nunca são gravadas nele.
