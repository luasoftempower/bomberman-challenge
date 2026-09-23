// Converte o tempo recebido em milissegundos para o formato do HUD, como "1:05".
// Não depende do DOM nem do idioma, por isso fica em um utilitário separado.
export function formatMatchTime(milliseconds) {
  // Number converte o valor; || 0 cobre valores vazios ou não numéricos (NaN).
  // ceil arredonda para cima para não mostrar 0:00 enquanto resta parte de um
  // segundo. max impede que um tempo negativo apareça no contador.
  const totalSeconds = Math.max(0, Math.ceil((Number(milliseconds) || 0) / 1000));
  // Cada minuto tem 60 segundos; floor descarta a fração de minuto.
  const minutes = Math.floor(totalSeconds / 60);
  // % 60 obtém os segundos restantes e padStart mantém dois dígitos: 5 vira 05.
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
