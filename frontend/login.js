// public/login.js

document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {
    // 1. Impede o formulário de recarregar a página
    event.preventDefault();

    // 2. Pega os valores digitados pelo usuário
    const usernameInput = document.getElementById("username").value;
    const passwordInput = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    // 3. Define o usuário e a senha "corretos" (ficam visíveis aqui, por isso não é seguro)
    const usuarioCorreto = "admin";
    const senhaCorreta = "1234";

    // 4. Verifica se o usuário e a senha batem
    // ...
    if (usernameInput === usuarioCorreto && passwordInput === senhaCorreta) {
      // Se estiverem corretos:

      // 1. Mostra a mensagem de sucesso na cor verde
      errorMessage.textContent = "Login bem-sucedido! Redirecionando...";
      errorMessage.style.color = "var(--success-color)"; // Usando a cor de sucesso do seu CSS!

      // 2. Guarda a informação de que o usuário está logado
      sessionStorage.setItem("usuarioLogado", "true");

      // 3. Aguarda 1 segundo e SÓ DEPOIS redireciona para a página principal
      setTimeout(() => {
        window.location.href = '/app';
      }, 1000); // 1000 milissegundos = 1 segundo
    } else {
      // ...
      // Se estiverem errados:
      errorMessage.textContent = "Usuário ou senha inválidos.";
    }
  });
