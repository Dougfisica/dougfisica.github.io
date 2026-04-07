const ENVIRONMENTS = {
  terra: {
    label: "Terra",
    gravity: 9.81,
    chip: "Terra . 9.81 m/s²",
    gradient: "linear-gradient(180deg, #77c3ff 0%, #d9eefc 62%, #f6e2bd 100%)",
    text: "#102033",
    starOpacity: "0",
    scaleLine: "rgba(16, 32, 51, 0.18)",
    scaleText: "rgba(16, 32, 51, 0.68)",
    badgeBg: "rgba(255, 255, 255, 0.72)",
    badgeBorder: "rgba(255, 255, 255, 0.45)",
    badgeText: "#102033",
    laneLine: "rgba(255, 255, 255, 0.48)",
    laneGlow: "rgba(255, 255, 255, 0.08)",
    groundMain: "linear-gradient(180deg, rgba(245, 221, 177, 0.92), rgba(167, 114, 78, 0.98))",
    groundOverlay: "linear-gradient(90deg, rgba(0, 0, 0, 0.1), transparent)",
    glowA: "rgba(255, 248, 205, 0.58)",
    glowB: "rgba(255, 160, 77, 0.22)",
    cloudOpacity: "0.82",
    cloudColor: "rgba(255, 255, 255, 0.72)",
    hazeColor: "rgba(255, 245, 214, 0.24)",
    groundLabel: "rgba(255, 255, 255, 0.95)",
  },
  lua: {
    label: "Lua",
    gravity: 1.62,
    chip: "Lua . 1.62 m/s²",
    gradient: "linear-gradient(180deg, #09111d 0%, #17283a 45%, #313c49 100%)",
    text: "#edf5ff",
    starOpacity: "1",
    scaleLine: "rgba(255, 255, 255, 0.18)",
    scaleText: "rgba(237, 245, 255, 0.72)",
    badgeBg: "rgba(10, 18, 32, 0.52)",
    badgeBorder: "rgba(196, 216, 255, 0.16)",
    badgeText: "#edf5ff",
    laneLine: "rgba(183, 208, 255, 0.54)",
    laneGlow: "rgba(119, 169, 255, 0.08)",
    groundMain: "linear-gradient(180deg, rgba(157, 170, 182, 0.94), rgba(82, 91, 106, 0.98))",
    groundOverlay: "linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent)",
    glowA: "rgba(199, 220, 255, 0.24)",
    glowB: "rgba(126, 144, 183, 0.18)",
    cloudOpacity: "0",
    cloudColor: "rgba(255, 255, 255, 0.18)",
    hazeColor: "rgba(207, 222, 255, 0.08)",
    groundLabel: "rgba(240, 247, 255, 0.95)",
  },
  marte: {
    label: "Marte",
    gravity: 3.71,
    chip: "Marte . 3.71 m/s²",
    gradient: "linear-gradient(180deg, #a54322 0%, #d37842 52%, #f0c081 100%)",
    text: "#fff3ea",
    starOpacity: "0.15",
    scaleLine: "rgba(255, 242, 233, 0.18)",
    scaleText: "rgba(255, 243, 234, 0.8)",
    badgeBg: "rgba(115, 44, 20, 0.38)",
    badgeBorder: "rgba(255, 226, 199, 0.2)",
    badgeText: "#fff3ea",
    laneLine: "rgba(255, 219, 185, 0.46)",
    laneGlow: "rgba(255, 177, 119, 0.07)",
    groundMain: "linear-gradient(180deg, rgba(232, 166, 108, 0.95), rgba(126, 50, 28, 0.98))",
    groundOverlay: "linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent)",
    glowA: "rgba(255, 198, 140, 0.36)",
    glowB: "rgba(255, 129, 76, 0.2)",
    cloudOpacity: "0.28",
    cloudColor: "rgba(255, 210, 182, 0.34)",
    hazeColor: "rgba(255, 198, 150, 0.16)",
    groundLabel: "rgba(255, 244, 236, 0.94)",
  },
  jupiter: {
    label: "Júpiter",
    gravity: 24.79,
    chip: "Júpiter . 24.79 m/s²",
    gradient: "linear-gradient(180deg, #d8aa84 0%, #b25d44 44%, #6c2b2a 100%)",
    text: "#fff3eb",
    starOpacity: "0.35",
    scaleLine: "rgba(255, 240, 229, 0.2)",
    scaleText: "rgba(255, 243, 235, 0.82)",
    badgeBg: "rgba(87, 38, 33, 0.38)",
    badgeBorder: "rgba(255, 227, 208, 0.18)",
    badgeText: "#fff3eb",
    laneLine: "rgba(255, 227, 196, 0.52)",
    laneGlow: "rgba(255, 177, 119, 0.06)",
    groundMain: "linear-gradient(180deg, rgba(239, 204, 161, 0.95), rgba(121, 58, 45, 0.98))",
    groundOverlay: "linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent)",
    glowA: "rgba(255, 220, 173, 0.34)",
    glowB: "rgba(196, 88, 65, 0.24)",
    cloudOpacity: "0.18",
    cloudColor: "rgba(255, 229, 208, 0.24)",
    hazeColor: "rgba(255, 215, 176, 0.14)",
    groundLabel: "rgba(255, 244, 236, 0.95)",
  },
};

const MAX_HEIGHT = 100;
const sphere = document.getElementById("sphere");
const shadow = document.getElementById("drop-shadow");
const impactBurst = document.getElementById("impact-burst");
const meterScale = document.getElementById("meter-scale");
const stage = document.getElementById("simulation-stage");
const fallLane = document.querySelector(".fall-lane");
const environmentChip = document.getElementById("environment-chip");
const environmentInput = document.getElementById("environment-input");
const environmentButtons = Array.from(document.querySelectorAll(".environment-button"));
const dragHint = document.getElementById("drag-hint");
const timerDisplay = document.getElementById("timer-display");
const heightValue = document.getElementById("height-value");
const gravityValue = document.getElementById("gravity-value");
const resultPanel = document.getElementById("result-panel");
const resultSummary = document.getElementById("result-summary");
const resultSubstitution = document.getElementById("result-substitution");
const resultValue = document.getElementById("result-value");
const ground = document.querySelector(".ground");
const stars = document.querySelector(".stars");

const state = {
  height: 100,
  environment: "terra",
  isFalling: false,
  isDragging: false,
  animationId: null,
  startTime: null,
  elapsedSeconds: 0,
  dragPointerId: null,
  xRatio: 0.44,
};

function buildScale() {
  for (let value = 0; value <= MAX_HEIGHT; value += 10) {
    const tick = document.createElement("div");
    tick.className = "scale-tick";
    tick.dataset.label = `${value} m`;
    tick.style.bottom = `${(value / MAX_HEIGHT) * 100}%`;
    meterScale.appendChild(tick);
  }
}

function formatSeconds(value) {
  return `${value.toFixed(3)} s`;
}

function setInputsDisabled(disabled) {
  environmentButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function syncEnvironmentButtons() {
  environmentButtons.forEach((button) => {
    const isActive = button.dataset.environment === state.environment;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function getFlightHeightPx() {
  const laneHeight = fallLane.clientHeight;
  const sphereSize = sphere.offsetHeight;
  return Math.max(laneHeight - sphereSize, 0);
}

function getFlightWidthPx() {
  const laneWidth = fallLane.clientWidth;
  const sphereSize = sphere.offsetWidth;
  return Math.max(laneWidth - sphereSize, 0);
}

function setSphereByHeight(heightMeters) {
  const distanceFromGroundRatio = heightMeters / MAX_HEIGHT;
  const travelPx = getFlightHeightPx();
  const topPx = travelPx * (1 - distanceFromGroundRatio);
  setSpherePosition(topPx, state.xRatio);
}

function setSpherePosition(topPx, xRatio = state.xRatio) {
  const travelHeightPx = getFlightHeightPx();
  const travelWidthPx = getFlightWidthPx();
  const safeTop = Math.min(Math.max(topPx, 0), travelHeightPx);
  const safeXRatio = Math.min(Math.max(xRatio, 0), 1);
  const leftPx = travelWidthPx * safeXRatio;
  const distanceFromGroundRatio = 1 - safeTop / Math.max(travelHeightPx, 1);
  const scale = 0.92 + distanceFromGroundRatio * 0.12;
  const shadowScale = 0.5 + (1 - distanceFromGroundRatio) * 0.65;
  const shadowOpacity = 0.12 + (1 - distanceFromGroundRatio) * 0.3;
  const shadowLeftPx = leftPx + (sphere.offsetWidth - shadow.offsetWidth) / 2;
  const burstLeftPx = leftPx + (sphere.offsetWidth - impactBurst.offsetWidth) / 2;

  sphere.style.top = `${safeTop}px`;
  sphere.style.left = `${leftPx}px`;
  sphere.style.transform = `scale(${scale})`;
  shadow.style.left = `${shadowLeftPx}px`;
  shadow.style.transform = `scaleX(${shadowScale})`;
  shadow.style.opacity = shadowOpacity.toFixed(2);
  impactBurst.style.left = `${burstLeftPx}px`;
  state.xRatio = safeXRatio;
}

function setDragReadyState(enabled) {
  sphere.classList.toggle("is-draggable", enabled);
  sphere.setAttribute("aria-grabbed", enabled ? "false" : "true");
  dragHint.textContent = enabled
    ? "Arraste a esfera na área de simulação e solte para iniciar a queda."
    : "Queda em andamento.";
}

function applyEnvironmentTheme() {
  const env = ENVIRONMENTS[state.environment];
  stage.style.setProperty("--stage-gradient", env.gradient);
  stage.style.color = env.text;
  stage.style.setProperty("--scale-line", env.scaleLine);
  stage.style.setProperty("--scale-text", env.scaleText);
  stage.style.setProperty("--badge-bg", env.badgeBg);
  stage.style.setProperty("--badge-border", env.badgeBorder);
  stage.style.setProperty("--badge-text", env.badgeText);
  stage.style.setProperty("--lane-line", env.laneLine);
  stage.style.setProperty("--lane-glow", env.laneGlow);
  stage.style.setProperty("--ground-main", env.groundMain);
  stage.style.setProperty("--ground-overlay", env.groundOverlay);
  stage.style.setProperty("--glow-a", env.glowA);
  stage.style.setProperty("--glow-b", env.glowB);
  stage.style.setProperty("--cloud-opacity", env.cloudOpacity);
  stage.style.setProperty("--cloud-color", env.cloudColor);
  stage.style.setProperty("--haze-color", env.hazeColor);
  stage.style.setProperty("--ground-label", env.groundLabel);
  environmentChip.textContent = env.chip;
  gravityValue.textContent = `${env.gravity.toFixed(2)} m/s²`;
  stars.style.opacity = env.starOpacity;
  syncEnvironmentButtons();

  document.querySelectorAll(".scale-tick").forEach((tick) => {
    tick.style.background = env.scaleLine;
    tick.style.color = env.scaleText;
  });
}

function syncHeightLabel() {
  heightValue.textContent = `${state.height.toFixed(1)} m`;
}

function updateTimer(seconds) {
  timerDisplay.textContent = formatSeconds(seconds);
}

function resetResults() {
  resultPanel.classList.add("is-hidden");
  resultSummary.textContent = "";
  resultSubstitution.textContent = "";
  resultValue.textContent = "";
}

function showImpact() {
  impactBurst.classList.remove("is-active");
  void impactBurst.offsetWidth;
  impactBurst.classList.add("is-active");
}

function finishDrop(measuredTime) {
  const roundedTime = Number(measuredTime.toFixed(3));
  const computedGravity = (2 * state.height) / (roundedTime * roundedTime);

  state.isFalling = false;
  state.isDragging = false;
  state.animationId = null;
  state.elapsedSeconds = roundedTime;
  state.dragPointerId = null;

  setSphereByHeight(0);
  updateTimer(roundedTime);
  showImpact();
  setInputsDisabled(false);
  setDragReadyState(true);

  resultSummary.textContent = `Tempo medido: ${roundedTime.toFixed(3)} s para uma altura de ${state.height.toFixed(1)} m no ambiente ${ENVIRONMENTS[state.environment].label}.`;
  resultSubstitution.textContent = `g = (2 × ${state.height.toFixed(1)}) / ${roundedTime.toFixed(3)}²`;
  resultValue.textContent = `g = ${computedGravity.toFixed(2)} m/s²`;
  resultPanel.classList.remove("is-hidden");
}

function animateDrop(timestamp) {
  if (!state.isFalling) {
    return;
  }

  if (state.startTime === null) {
    state.startTime = timestamp;
  }

  const env = ENVIRONMENTS[state.environment];
  const elapsedSeconds = (timestamp - state.startTime) / 1000;
  const currentHeight = Math.max(state.height - 0.5 * env.gravity * elapsedSeconds * elapsedSeconds, 0);

  state.elapsedSeconds = elapsedSeconds;
  setSphereByHeight(currentHeight);
  updateTimer(elapsedSeconds);

  if (currentHeight <= 0) {
    finishDrop(elapsedSeconds);
    return;
  }

  state.animationId = requestAnimationFrame(animateDrop);
}

function resetSimulation() {
  if (state.animationId !== null) {
    cancelAnimationFrame(state.animationId);
  }

  state.isFalling = false;
  state.isDragging = false;
  state.animationId = null;
  state.startTime = null;
  state.elapsedSeconds = 0;
  state.dragPointerId = null;

  updateTimer(0);
  setInputsDisabled(false);
  resetResults();
  impactBurst.classList.remove("is-active");
  sphere.classList.remove("is-dragging");
  setSphereByHeight(state.height);
  setDragReadyState(true);
}

function beginDrop() {
  if (state.isFalling) {
    return;
  }

  resetResults();
  setInputsDisabled(true);
  updateTimer(0);
  state.isFalling = true;
  state.startTime = null;
  state.elapsedSeconds = 0;
  state.animationId = requestAnimationFrame(animateDrop);
  setDragReadyState(false);
}

function positionFromPointer(clientX, clientY) {
  const laneRect = fallLane.getBoundingClientRect();
  const sphereRadius = sphere.offsetHeight / 2;
  const localCenterX = clientX - laneRect.left;
  const localCenterY = clientY - laneRect.top;
  const clampedCenterX = Math.min(Math.max(localCenterX, sphereRadius), laneRect.width - sphereRadius);
  const clampedCenterY = Math.min(Math.max(localCenterY, sphereRadius), laneRect.height - sphereRadius);
  const topPx = clampedCenterY - sphereRadius;
  const leftPx = clampedCenterX - sphereRadius;
  const travelHeightPx = getFlightHeightPx();
  const travelWidthPx = getFlightWidthPx();
  const height = Math.min(Math.max((1 - topPx / Math.max(travelHeightPx, 1)) * MAX_HEIGHT, 0), MAX_HEIGHT);
  const xRatio = Math.min(Math.max(leftPx / Math.max(travelWidthPx, 1), 0), 1);

  return { height, topPx, xRatio };
}

function handleDragStart(clientX, clientY, pointerId) {
  if (state.isFalling || environmentInput.disabled) {
    return;
  }

  state.isDragging = true;
  state.dragPointerId = pointerId;
  sphere.classList.add("is-dragging");
  sphere.setAttribute("aria-grabbed", "true");
  impactBurst.classList.remove("is-active");
  resetResults();
  updateTimer(0);
  handleDragMove(clientX, clientY);
}

function handleDragMove(clientX, clientY) {
  if (!state.isDragging || state.isFalling) {
    return;
  }

  const { height, topPx, xRatio } = positionFromPointer(clientX, clientY);
  state.height = height;
  syncHeightLabel();
  setSpherePosition(topPx, xRatio);
}

function handleDragEnd() {
  if (!state.isDragging) {
    return;
  }

  state.isDragging = false;
  state.dragPointerId = null;
  sphere.classList.remove("is-dragging");
  beginDrop();
}

environmentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }

    state.environment = button.dataset.environment;
    applyEnvironmentTheme();
    if (!state.isFalling) {
      resetResults();
      updateTimer(0);
    }
  });
});

sphere.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  handleDragStart(event.clientX, event.clientY, event.pointerId);
  sphere.setPointerCapture(event.pointerId);
});

sphere.addEventListener("pointermove", (event) => {
  if (state.dragPointerId === event.pointerId) {
    handleDragMove(event.clientX, event.clientY);
  }
});

sphere.addEventListener("pointerup", (event) => {
  if (sphere.hasPointerCapture(event.pointerId)) {
    sphere.releasePointerCapture(event.pointerId);
  }
  handleDragEnd();
});

sphere.addEventListener("pointercancel", (event) => {
  if (sphere.hasPointerCapture(event.pointerId)) {
    sphere.releasePointerCapture(event.pointerId);
  }
  state.isDragging = false;
  state.dragPointerId = null;
  sphere.classList.remove("is-dragging");
  setSphereByHeight(state.height);
  sphere.setAttribute("aria-grabbed", "false");
});

sphere.addEventListener("lostpointercapture", () => {
  if (state.isDragging) {
    handleDragEnd();
  }
});

sphere.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !state.isFalling) {
    event.preventDefault();
    beginDrop();
  }
});

window.addEventListener("resize", () => {
  if (!state.isFalling) {
    setSphereByHeight(state.height);
  }
});

buildScale();
syncHeightLabel();
applyEnvironmentTheme();
resetSimulation();
