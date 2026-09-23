// Utilitário compartilhado entre os componentes e o sistema de tradução.
// Recebe um valor e devolve texto escapado; não altera o valor original.
// essa função serve pra tratar caracteres especiais antes de colocar textos no HTML
// isso evita que coisas como <, > ou aspas sejam interpretadas como código HTML
//
// por exemplo:
// <teste> vira &lt;teste&gt;
//
// além de evitar problemas no HTML, isso também ajuda na segurança
export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]
  );
