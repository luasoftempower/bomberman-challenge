const MOVEMENT_ACTIONS = new Set(["left", "right", "up", "down"]);

export function resolveInput(held, directionOrder = []) {
  const direction = [...directionOrder].reverse().find((action) => held.has(action))
    || ["left", "right", "up", "down"].find((action) => held.has(action));
  return {
    dx: direction === "right" ? 1 : direction === "left" ? -1 : 0,
    dy: direction === "down" ? 1 : direction === "up" ? -1 : 0,
    drop: held.has("drop"),
    detonate: held.has("detonate"),
    special: held.has("special"),
  };
}

export function createInputController(send, onInput = () => {}) {
  const sourcesByAction = new Map();
  const directionOrder = [];
  let last = "";
  let packetSequence = 0;
  let directionSequence = 0;
  let latestDirection = null;
  const keyMap = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    Space: "drop", KeyE: "detonate", KeyQ: "special",
  };
  const held = () => new Set([...sourcesByAction].filter(([, sources]) => sources.size).map(([action]) => action));
  const value = () => resolveInput(held(), directionOrder);

  function emit(force = false) {
    const input = value();
    const serialized = JSON.stringify(input);
    const changed = serialized !== last;
    if (changed) onInput(input);
    if (force || changed) {
      last = serialized;
      packetSequence += 1;
      send({ type: "input", ...input, sequence: packetSequence, direction: latestDirection, directionSequence });
    }
  }

  function press(action, source) {
    const sources = sourcesByAction.get(action) || new Set();
    const wasHeld = sources.size > 0;
    sources.add(source);
    sourcesByAction.set(action, sources);
    if (MOVEMENT_ACTIONS.has(action) && !wasHeld) {
      const oldIndex = directionOrder.indexOf(action);
      if (oldIndex >= 0) directionOrder.splice(oldIndex, 1);
      directionOrder.push(action);
      latestDirection = action;
      directionSequence += 1;
    }
    emit();
  }

  function release(action, source) {
    const sources = sourcesByAction.get(action);
    if (!sources) return;
    sources.delete(source);
    if (!sources.size) {
      sourcesByAction.delete(action);
      const index = directionOrder.indexOf(action);
      if (index >= 0) directionOrder.splice(index, 1);
    }
    emit();
  }

  function releaseAll() {
    if (!sourcesByAction.size) return;
    sourcesByAction.clear();
    directionOrder.length = 0;
    emit(true);
  }

  const keydown = (event) => {
    const action = keyMap[event.code] || keyMap[event.key];
    if (!action) return;
    event.preventDefault();
    press(action, `key:${event.code || event.key}`);
  };
  const keyup = (event) => {
    const action = keyMap[event.code] || keyMap[event.key];
    if (!action) return;
    event.preventDefault();
    release(action, `key:${event.code || event.key}`);
  };
  const visibilityChange = () => { if (document.hidden) releaseAll(); };

  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", visibilityChange);

  const buttonListeners = [];
  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    const pressPointer = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      press(action, `pointer:${event.pointerId}`);
    };
    const releasePointer = (event) => {
      event.preventDefault();
      release(action, `pointer:${event.pointerId}`);
    };
    button.addEventListener("pointerdown", pressPointer);
    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", releasePointer);
    buttonListeners.push([button, pressPointer, releasePointer]);
  });

  // Changes are immediate; this slower copy only repairs transient proxy/network loss.
  const heartbeat = setInterval(() => emit(true), 250);
  emit(true);

  return () => {
    releaseAll();
    clearInterval(heartbeat);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", releaseAll);
    document.removeEventListener("visibilitychange", visibilityChange);
    for (const [button, pressPointer, releasePointer] of buttonListeners) {
      button.removeEventListener("pointerdown", pressPointer);
      button.removeEventListener("pointerup", releasePointer);
      button.removeEventListener("pointercancel", releasePointer);
    }
  };
}
