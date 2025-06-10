# Sistema de Reservas de Salas - UFPR

Um sistema web para gerenciar reservas de salas da universidade, com interface moderna e integração Firebase.

## 🚀 Funcionalidades

- ✅ Buscar salas disponíveis por data e horário
- ✅ Visualizar salas ocupadas com informações do docente/disciplina
- ✅ Reservar salas disponíveis
- ✅ Interface responsiva e moderna
- ✅ Integração com Firebase (opcional)
- ✅ Armazenamento local como fallback

## 📁 Estrutura do Projeto

```
UFPR/reserva_salas_cursor/
├── index.html              # Página principal
├── style.css               # Estilos CSS
├── script.js               # Lógica principal
├── firebase-config.js      # Configuração Firebase
├── grade_2025_2s.json     # Dados das disciplinas
└── README.md              # Este arquivo
```

## 🛠️ Como Usar

### 1. Testar Localmente

1. Abra o arquivo `index.html` em um navegador web
2. O sistema funcionará em modo local (dados salvos no navegador)
3. Para funcionalidade completa, configure o Firebase (opcional)

### 2. Configurar Firebase (Opcional)

#### Passos para configurar:

1. **Criar projeto Firebase:**
   - Acesse https://console.firebase.google.com/
   - Clique em "Adicionar projeto"
   - Siga o assistente de criação

2. **Ativar Realtime Database:**
   - No console do projeto, vá em "Realtime Database"
   - Clique em "Criar banco de dados"
   - Escolha o modo de teste (para desenvolvimento)

3. **Obter configurações:**
   - Vá em "Configurações do projeto" (ícone de engrenagem)
   - Clique em "Configurações gerais"
   - Role até "Seus apps" e clique no ícone web `</>`
   - Copie as configurações do Firebase

4. **Configurar o projeto:**
   - Abra o arquivo `firebase-config.js`
   - Substitua os valores `SUA_API_KEY`, `SEU_PROJECT_ID`, etc. pelos seus dados reais
   - Salve o arquivo

#### Exemplo de configuração:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "ufpr-reservas.firebaseapp.com", 
    databaseURL: "https://ufpr-reservas-default-rtdb.firebaseio.com",
    projectId: "ufpr-reservas",
    storageBucket: "ufpr-reservas.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:xxxxxxxxxxxxxxxxxxxxxxxx"
};
```

### 3. Deploy no GitHub Pages

1. **Preparar repositório:**
   ```bash
   # Navegue até a pasta do projeto
   cd UFPR/reserva_salas_cursor
   
   # Adicione os arquivos ao git
   git add .
   git commit -m "Sistema de reservas de salas"
   git push origin main
   ```

2. **Ativar GitHub Pages:**
   - Vá para as configurações do repositório no GitHub
   - Role até a seção "Pages"
   - Em "Source", selecione "Deploy from a branch"
   - Escolha "main" branch e pasta `/UFPR/reserva_salas_cursor`
   - Clique em "Save"

3. **Acessar o site:**
   - O site estará disponível em: `https://seuusuario.github.io/repositorio/UFPR/reserva_salas_cursor/`

## 🔧 Personalização

### Adicionar novas salas:
Edite o arquivo `grade_2025_2s.json` e adicione horários com as novas salas.

### Modificar horários disponíveis:
Edite as opções de horário nos elementos `<select>` do arquivo `index.html`.

### Personalizar visual:
Modifique o arquivo `style.css` para alterar cores, fontes e layout.

## 🌐 Alternativas de Backend Gratuito

Se preferir não usar Firebase, aqui estão outras opções gratuitas:

### 1. **Glitch.com**
- Ideal para projetos pequenos
- Interface amigável
- Suporta Node.js

### 2. **Render.com**  
- Plano gratuito generoso
- Deploy automático via Git
- Suporta múltiplas linguagens

### 3. **Vercel**
- Ótimo para projetos frontend/backend
- Deploy automático
- Integração com GitHub

### 4. **Netlify**
- Focado em sites estáticos
- Funções serverless
- Forms integrados

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- 💻 Desktop
- 📱 Smartphones
- 📟 Tablets

## 🐛 Solução de Problemas

### Problema: Dados não carregam
**Solução:** Verifique se o arquivo `grade_2025_2s.json` está na mesma pasta que o `index.html`.

### Problema: Firebase não funciona
**Solução:** 
1. Verifique se as configurações no `firebase-config.js` estão corretas
2. Confirme se o Realtime Database está ativado no Firebase Console
3. Verifique as regras de segurança do banco

### Problema: Site não funciona no GitHub Pages
**Solução:**
1. Verifique se todos os arquivos foram commitados
2. Confirme se o caminho nas configurações do Pages está correto
3. Aguarde alguns minutos para a propagação

## 🤝 Contribuição

Para contribuir com melhorias:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## 📞 Suporte

Se precisar de ajuda:
1. Verifique este README
2. Consulte a documentação do Firebase
3. Abra uma issue no repositório

---

**Desenvolvido para UFPR** 🎓 