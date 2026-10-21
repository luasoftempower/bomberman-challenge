/**
 * Mantém apenas o snapshot mais recente até o próximo quadro visual.
 *
 * Proxies e instâncias compartilhadas podem entregar vários WebSockets de uma
 * vez depois de uma pausa curta. Processar cada estado intermediário reconstrói
 * HUD, efeitos e previsão em sequência, justamente quando o navegador tenta se
 * recuperar. Eventos confiáveis continuam sendo entregues imediatamente.
 */
export function createLatestSnapshotBuffer(
  deliver,
  {
    schedule = (callback) => requestAnimationFrame(callback),
    cancel = (token) => cancelAnimationFrame(token),
  } = {},
) {
  let pending = null;
  let scheduled = null;

  const deliverPending = () => {
    if (!pending) return false;
    const latest = pending;
    pending = null;
    deliver(latest);
    return true;
  };

  const push = (snapshot) => {
    pending = snapshot;
    if (scheduled !== null) return;
    scheduled = schedule(() => {
      scheduled = null;
      deliverPending();
    });
  };

  const flush = () => {
    if (scheduled !== null) cancel(scheduled);
    scheduled = null;
    return deliverPending();
  };

  const clear = () => {
    if (scheduled !== null) cancel(scheduled);
    scheduled = null;
    pending = null;
  };

  return { push, flush, clear };
}
