export interface Ui {
  setStatus(message: string, state?: "info" | "error"): void;
  clearStatus(): void;
  showHint(): void;
  /** Drives the little "how bothered is he" meter, 0..1. */
  setAnnoyance(value: number): void;
}

export function createUi(root: HTMLElement): Ui {
  const layer = document.createElement("div");
  layer.className = "ui-layer";

  const status = document.createElement("div");
  status.className = "status-pill";
  status.textContent = "Waking up the meadow…";

  const meter = document.createElement("div");
  meter.className = "meter hidden";
  const meterFill = document.createElement("div");
  meterFill.className = "meter-fill";
  meter.append(meterFill);

  const hint = document.createElement("div");
  hint.className = "hint-pill hidden";
  hint.textContent = "Poke Snorlax 💤 · WASD to wander";

  layer.append(status, meter, hint);
  root.append(layer);

  let lastShown = false;

  return {
    setStatus(message, state = "info") {
      status.textContent = message;
      status.dataset.state = state;
      status.classList.remove("hidden");
    },
    clearStatus() {
      status.classList.add("hidden");
    },
    showHint() {
      hint.classList.remove("hidden");
    },
    setAnnoyance(value) {
      const visible = value > 0.04;
      if (visible !== lastShown) {
        meter.classList.toggle("hidden", !visible);
        lastShown = visible;
      }
      if (!visible) return;
      meterFill.style.width = `${Math.min(100, value * 100)}%`;
      // Calm blue → warm amber → cross as he approaches waking.
      const hue = 205 - value * 175;
      meterFill.style.background = `hsl(${hue}, 70%, 62%)`;
    },
  };
}
