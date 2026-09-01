export function createInputController(send, onInput = () => {}) {
  const held = new Set();
  let last = "";
  const keyMap = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    " ": "drop",
  };
  const value = () => ({ dx: Number(held.has("right")) - Number(held.has("left")), dy: Number(held.has("down")) - Number(held.has("up")), drop: held.has("drop") });
  function emit(force = false) {
    const input = value();
    const serialized = JSON.stringify(input);
    const changed = serialized !== last;
    if (changed) onInput(input);
    if (force || changed) { last = serialized; send({ type: "input", ...input }); }
  }
  const keydown = (event) => {
    const action = keyMap[event.key];
    if (!action) return;
    event.preventDefault(); held.add(action); emit();
  };
  const keyup = (event) => { const action = keyMap[event.key]; if (!action) return; event.preventDefault(); held.delete(action); emit(); };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  const heartbeat = setInterval(() => emit(true), 100);
  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    const press = (event) => { event.preventDefault(); held.add(action); emit(); };
    const release = (event) => { event.preventDefault(); held.delete(action); emit(); };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });
  return () => { clearInterval(heartbeat); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); };
}
