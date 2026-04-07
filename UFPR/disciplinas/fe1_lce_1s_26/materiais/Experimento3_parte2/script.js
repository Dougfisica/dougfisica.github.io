const GRAVITY = 9.81;
const STROBE_INTERVAL = 0.1;
const TOLERANCE = 0.02;
const MIN_VX = 2.4;
const MAX_VX = 6.4;
const MIN_V0Y = 3.4;
const MAX_V0Y = 6.8;
const MAX_FLIGHT_TIME = (2 * MAX_V0Y) / GRAVITY;
const MAX_RANGE = MAX_VX * MAX_FLIGHT_TIME;
const MAX_HEIGHT = (MAX_V0Y * MAX_V0Y) / (2 * GRAVITY);
const FIXED_MAX_X = Number((MAX_RANGE * 1.08).toFixed(1));
const FIXED_MAX_Y = Number((MAX_HEIGHT * 1.12).toFixed(1));

const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");

const launchButton = document.getElementById("launchButton");
const measureButton = document.getElementById("measureButton");
const verifyButton = document.getElementById("verifyButton");
const toggleHeight = document.getElementById("toggleHeight");
const toggleDistance = document.getElementById("toggleDistance");
const feedbackCard = document.querySelector(".feedback-card");
const feedbackMessage = document.getElementById("feedbackMessage");
const statusChip = document.getElementById("statusChip");
const inputV0y = document.getElementById("inputV0y");
const inputTime = document.getElementById("inputTime");
const inputVx = document.getElementById("inputVx");

const state = {
  animationFrame: null,
  scenario: null,
  path: [],
  strobePoints: [],
  currentTime: 0,
  showMeasures: false,
  isAnimating: false,
  completed: false,
  needsResize: true,
  isAiming: false,
  aimStart: null,
  aimCurrent: null,
  pendingOrigin: null
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  state.needsResize = false;
  drawScene();
}

function resetFeedback() {
  feedbackCard.classList.remove("success", "error");
  feedbackMessage.textContent = "Gere um lançamento, observe a trajetória e calcule as grandezas antes de verificar.";
}

function setFeedback(message, type) {
  feedbackCard.classList.remove("success", "error");
  if (type) {
    feedbackCard.classList.add(type);
  }
  feedbackMessage.textContent = message;
}

function setStatus(message) {
  statusChip.textContent = message;
}

function createScenarioFromAim(originX, vx, v0y) {
  const speed = Math.hypot(vx, v0y);
  const angleDeg = (Math.atan2(v0y, vx) * 180) / Math.PI;
  const totalTime = (2 * v0y) / GRAVITY;
  const maxHeight = (v0y * v0y) / (2 * GRAVITY);
  const range = vx * totalTime;

  return {
    angleDeg,
    speed,
    vx,
    v0y,
    totalTime,
    maxHeight,
    range,
    launchHeight: 0,
    launchX: originX
  };
}

function clearInputs() {
  inputV0y.value = "";
  inputTime.value = "";
  inputVx.value = "";
}

function generateFlightPath(scenario) {
  const samples = [];
  const dt = 1 / 120;

  for (let time = 0; time <= scenario.totalTime; time += dt) {
    samples.push(sampleMotion(scenario, time));
  }

  samples.push(sampleMotion(scenario, scenario.totalTime));
  return samples;
}

function generateStrobePoints(scenario) {
  const points = [];
  for (let time = 0; time <= scenario.totalTime + 1e-9; time += STROBE_INTERVAL) {
    points.push(sampleMotion(scenario, Math.min(time, scenario.totalTime)));
  }
  const lastPoint = sampleMotion(scenario, scenario.totalTime);
  const lastStored = points[points.length - 1];
  if (!lastStored || Math.abs(lastStored.t - scenario.totalTime) > 1e-6) {
    points.push(lastPoint);
  }
  return points;
}

function sampleMotion(scenario, time) {
  return {
    t: time,
    x: scenario.launchX + scenario.vx * time,
    y: Math.max(0, scenario.v0y * time - 0.5 * GRAVITY * time * time)
  };
}

function getLayoutMetrics() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const left = 72;
  const right = 42;
  const top = 38;
  const bottom = 64;

  if (!state.scenario) {
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const pxPerMeter = Math.min(chartWidth / FIXED_MAX_X, chartHeight / FIXED_MAX_Y);
    const plotWidth = FIXED_MAX_X * pxPerMeter;
    const plotHeight = FIXED_MAX_Y * pxPerMeter;
    const plotTop = top;
    const plotBottom = plotTop + plotHeight;
    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      pxPerMeterX: pxPerMeter,
      pxPerMeterY: pxPerMeter,
      chartWidth,
      chartHeight,
      plotWidth,
      plotHeight,
      plotTop,
      plotBottom,
      maxX: FIXED_MAX_X,
      maxY: FIXED_MAX_Y
    };
  }

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxX = FIXED_MAX_X;
  const maxY = FIXED_MAX_Y;
  const pxPerMeter = Math.min(chartWidth / maxX, chartHeight / maxY);
  const pxPerMeterX = pxPerMeter;
  const pxPerMeterY = pxPerMeter;
  const plotWidth = maxX * pxPerMeter;
  const plotHeight = maxY * pxPerMeter;
  const plotTop = top;
  const plotBottom = plotTop + plotHeight;

  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    chartWidth,
    chartHeight,
    plotWidth,
    plotHeight,
    plotTop,
    plotBottom,
    pxPerMeterX,
    pxPerMeterY,
    maxX,
    maxY
  };
}

function worldToCanvas(x, y, metrics) {
  return {
    x: metrics.left + x * metrics.pxPerMeterX,
    y: metrics.plotBottom - y * metrics.pxPerMeterY
  };
}

function canvasToWorld(x, y, metrics) {
  return {
    x: (x - metrics.left) / metrics.pxPerMeterX,
    y: (metrics.plotBottom - y) / metrics.pxPerMeterY
  };
}

function drawBackground(metrics) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
  gradient.addColorStop(0, "rgba(21, 58, 47, 0.32)");
  gradient.addColorStop(1, "rgba(5, 14, 11, 0.18)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  const plotRight = metrics.left + metrics.plotWidth;
  const plotTop = metrics.plotTop;
  for (let x = metrics.left; x <= plotRight + 1; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, metrics.plotBottom);
    ctx.stroke();
  }
  for (let y = plotTop; y <= metrics.plotBottom + 1; y += 42) {
    ctx.beginPath();
    ctx.moveTo(metrics.left, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
  }
}

function drawAxes(metrics) {
  const baseY = metrics.plotBottom;
  const endX = metrics.left + metrics.plotWidth;
  const topY = metrics.plotTop;

  ctx.strokeStyle = "rgba(240, 246, 239, 0.9)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(metrics.left, topY);
  ctx.lineTo(metrics.left, baseY);
  ctx.lineTo(endX, baseY);
  ctx.stroke();

  drawArrow(endX, baseY, 1, 0);
  drawArrow(metrics.left, topY, 0, -1);

  ctx.fillStyle = "rgba(240, 246, 239, 0.85)";
  ctx.font = '600 13px "IBM Plex Sans"';
  ctx.fillText("x (m)", endX - 10, baseY + 32);
  ctx.fillText("y (m)", metrics.left - 10, topY - 16);

  const xStep = chooseTickStep(metrics.maxX);
  for (let x = 0; x <= metrics.maxX + 1e-9; x += xStep) {
    const point = worldToCanvas(x, 0, metrics);
    ctx.beginPath();
    ctx.moveTo(point.x, baseY - 6);
    ctx.lineTo(point.x, baseY + 6);
    ctx.strokeStyle = "rgba(240, 246, 239, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(240, 246, 239, 0.98)";
    ctx.fillText(x.toFixed(1), point.x - 10, baseY + 22);
  }

  const yStep = chooseTickStep(metrics.maxY);
  for (let y = 0; y <= metrics.maxY + 1e-9; y += yStep) {
    const point = worldToCanvas(0, y, metrics);
    ctx.beginPath();
    ctx.moveTo(metrics.left - 6, point.y);
    ctx.lineTo(metrics.left + 6, point.y);
    ctx.strokeStyle = "rgba(240, 246, 239, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(240, 246, 239, 0.98)";
    ctx.fillText(y.toFixed(1), metrics.left - 36, point.y + 4);
  }
}

function chooseTickStep(maxValue) {
  if (maxValue <= 4) return 0.5;
  if (maxValue <= 8) return 1;
  if (maxValue <= 16) return 2;
  return 5;
}

function drawArrow(x, y, dx, dy) {
  const size = 10;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, 5);
  ctx.lineTo(-size, -5);
  ctx.closePath();
  ctx.fillStyle = "rgba(240, 246, 239, 0.9)";
  ctx.fill();
  ctx.restore();
}

function drawPath(metrics) {
  if (!state.path.length) return;

  ctx.beginPath();
  state.path.forEach((point, index) => {
    const mapped = worldToCanvas(point.x, point.y, metrics);
    if (index === 0) {
      ctx.moveTo(mapped.x, mapped.y);
    } else {
      ctx.lineTo(mapped.x, mapped.y);
    }
  });
  ctx.strokeStyle = "rgba(239, 193, 74, 0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawStrobePoints(metrics) {
  if (!state.strobePoints.length) return;

  state.strobePoints.forEach((point) => {
    const mapped = worldToCanvas(point.x, point.y, metrics);
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(246, 215, 104, 0.28)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 247, 208, 0.86)";
    ctx.fill();
  });
}

function drawProjectile(metrics) {
  let point = null;

  if (state.scenario) {
    point = sampleMotion(state.scenario, state.currentTime);
  } else if (state.pendingOrigin) {
    point = { x: state.pendingOrigin.x, y: 0 };
  } else {
    point = { x: 0, y: 0 };
  }

  if (!point) return;
  const mapped = worldToCanvas(point.x, point.y, metrics);

  ctx.save();
  ctx.translate(mapped.x, mapped.y);
  ctx.rotate(-0.18);
  ctx.fillStyle = "#f8f0d8";
  ctx.fillRect(-9, -5, 18, 10);
  ctx.strokeStyle = "rgba(0,0,0,0.24)";
  ctx.strokeRect(-9, -5, 18, 10);
  ctx.restore();
}

function drawMeasures(metrics) {
  if (!state.showMeasures || !state.scenario || !state.completed) return;

  const apexX = state.scenario.launchX + state.scenario.vx * (state.scenario.v0y / GRAVITY);
  const apex = worldToCanvas(apexX, state.scenario.maxHeight, metrics);
  const groundBelowApex = worldToCanvas(apexX, 0, metrics);
  const landing = worldToCanvas(state.scenario.launchX + state.scenario.range, 0, metrics);
  const origin = worldToCanvas(state.scenario.launchX, 0, metrics);

  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "rgba(141, 225, 231, 0.95)";
  ctx.lineWidth = 2;

  if (toggleHeight.checked) {
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(groundBelowApex.x, groundBelowApex.y);
    ctx.stroke();
    drawMeasureLabel(
      apex.x + 12,
      (apex.y + groundBelowApex.y) / 2,
      `h = ${state.scenario.maxHeight.toFixed(2)} m`,
      "rgba(141, 225, 231, 0.18)"
    );
  }

  if (toggleDistance.checked) {
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y + 16);
    ctx.lineTo(landing.x, landing.y + 16);
    ctx.stroke();
    drawMeasureLabel(
      (origin.x + landing.x) / 2 - 40,
      landing.y + 46,
      `D = ${state.scenario.range.toFixed(2)} m`,
      "rgba(239, 193, 74, 0.2)"
    );
  }

  ctx.restore();
}

function drawMeasureLabel(x, y, text, fillStyle) {
  const paddingX = 10;
  const paddingY = 8;
  ctx.font = '14px "IBM Plex Sans"';
  const width = ctx.measureText(text).width + paddingX * 2;
  const height = 34;
  ctx.fillStyle = fillStyle;
  roundRect(ctx, x, y - height / 2, width, height, 12);
  ctx.fill();
  ctx.fillStyle = "#eef6ef";
  ctx.fillText(text, x + paddingX, y + 5);
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawIntro(metrics) {
  ctx.fillStyle = "rgba(238, 246, 239, 0.95)";
  ctx.font = '700 24px "Space Grotesk"';
  ctx.fillText("Clique no chão e arraste o giz", metrics.left + 28, metrics.top + 54);
  ctx.font = '16px "IBM Plex Sans"';
  ctx.fillStyle = "rgba(177, 194, 184, 0.95)";
  ctx.fillText("A seta mostra direção e intensidade. Solte o ponteiro para lançar e registrar a videoanálise.", metrics.left + 28, metrics.top + 84);
}

function drawAimArrow(metrics) {
  if (!state.pendingOrigin) return;

  const origin = worldToCanvas(state.pendingOrigin.x, 0, metrics);
  const current = state.aimCurrent || origin;
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const magnitude = Math.hypot(dx, dy);

  if (magnitude < 6) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 182, 72, 0.95)";
  ctx.fillStyle = "rgba(255, 182, 72, 0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(current.x, current.y);
  ctx.stroke();

  const angle = Math.atan2(dy, dx);
  ctx.translate(current.x, current.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-14, 7);
  ctx.lineTo(-14, -7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const vx = clamp(dx / 18, MIN_VX, MAX_VX);
  const v0y = clamp((-dy) / 18, MIN_V0Y, MAX_V0Y);
  drawMeasureLabel(current.x + 10, current.y - 20, `Vx ${vx.toFixed(1)} m/s | V0y ${v0y.toFixed(1)} m/s`, "rgba(255, 182, 72, 0.16)");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function drawScene() {
  if (state.needsResize) {
    resizeCanvas();
    return;
  }

  const metrics = getLayoutMetrics();
  drawBackground(metrics);
  drawAxes(metrics);

  if (!state.scenario) {
    drawIntro(metrics);
    drawAimArrow(metrics);
    drawProjectile(metrics);
    return;
  }

  drawPath(metrics);
  drawStrobePoints(metrics);
  drawMeasures(metrics);
  drawProjectile(metrics);
}

function resetLaunchState() {
  if (state.animationFrame) {
    cancelAnimationFrame(state.animationFrame);
  }

  clearInputs();
  resetFeedback();

  state.animationFrame = null;
  state.scenario = null;
  state.path = [];
  state.strobePoints = [];
  state.currentTime = 0;
  state.showMeasures = false;
  state.completed = false;
  state.isAnimating = false;
  state.isAiming = false;
  state.aimStart = null;
  state.aimCurrent = null;
  state.pendingOrigin = null;

  measureButton.textContent = "Mostrar Medidas";
  measureButton.disabled = true;
  verifyButton.disabled = true;
  setStatus("Clique no chão e arraste para lançar");
  drawScene();
}

function startLaunchFromAim(originX, vx, v0y) {
  clearInputs();
  resetFeedback();

  state.scenario = createScenarioFromAim(originX, vx, v0y);
  state.path = [];
  state.strobePoints = [];
  state.currentTime = 0;
  state.showMeasures = false;
  state.completed = false;
  state.isAnimating = true;
  state.isAiming = false;
  state.aimStart = null;
  state.aimCurrent = null;
  state.pendingOrigin = null;

  measureButton.textContent = "Mostrar Medidas";
  measureButton.disabled = true;
  verifyButton.disabled = true;
  setStatus("Trajetória em execução");

  const start = performance.now();
  const strobeTimes = generateStrobePoints(state.scenario).map((point) => point.t);
  let nextStrobeIndex = 0;

  function animate(now) {
    const elapsed = (now - start) / 1000;
    state.currentTime = Math.min(elapsed, state.scenario.totalTime);
    state.path = generateFlightPath({ ...state.scenario, totalTime: state.currentTime });

    while (nextStrobeIndex < strobeTimes.length && strobeTimes[nextStrobeIndex] <= state.currentTime + 1e-9) {
      state.strobePoints.push(sampleMotion(state.scenario, strobeTimes[nextStrobeIndex]));
      nextStrobeIndex += 1;
    }

    drawScene();

    if (state.currentTime < state.scenario.totalTime) {
      state.animationFrame = requestAnimationFrame(animate);
      return;
    }

    state.currentTime = state.scenario.totalTime;
    state.path = generateFlightPath(state.scenario);
    state.strobePoints = generateStrobePoints(state.scenario);
    state.completed = true;
    state.isAnimating = false;
    state.animationFrame = null;
    measureButton.disabled = false;
    verifyButton.disabled = false;
    setStatus("Voo concluído. Meça h e D.");
    drawScene();
  }

  state.animationFrame = requestAnimationFrame(animate);
}

function toggleMeasures() {
  if (!state.completed) return;
  state.showMeasures = !state.showMeasures;
  measureButton.textContent = state.showMeasures ? "Ocultar Medidas" : "Mostrar Medidas";
  if (state.showMeasures) {
    setStatus("Medições exibidas no quadro");
  } else {
    setStatus("Medições ocultas");
  }
  drawScene();
}

function isWithinTolerance(actual, userValue) {
  const delta = Math.abs(userValue - actual);
  return delta <= Math.max(Math.abs(actual) * TOLERANCE, 0.01);
}

function verifyAnswers() {
  if (!state.scenario || !state.completed) {
    setFeedback("Espere a simulação terminar antes de verificar os cálculos.", "error");
    return;
  }

  const v0yValue = Number(inputV0y.value);
  const timeValue = Number(inputTime.value);
  const vxValue = Number(inputVx.value);

  if (![v0yValue, timeValue, vxValue].every((value) => Number.isFinite(value) && value > 0)) {
    setFeedback("Preencha os três campos com números positivos para validar suas contas.", "error");
    return;
  }

  const v0yFromHeight = Math.sqrt(2 * GRAVITY * state.scenario.maxHeight);
  const totalTime = (2 * v0yFromHeight) / GRAVITY;
  const vxFromRange = state.scenario.range / totalTime;

  const checks = [
    isWithinTolerance(v0yFromHeight, v0yValue),
    isWithinTolerance(totalTime, timeValue),
    isWithinTolerance(vxFromRange, vxValue)
  ];

  if (checks.every(Boolean)) {
    setFeedback("Cálculos consistentes com a trajetória. A decomposição entre eixo vertical e horizontal foi aplicada corretamente.", "success");
    setStatus("Respostas corretas");
    return;
  }

  const wrongFields = [];
  if (!checks[0]) wrongFields.push("V0y");
  if (!checks[1]) wrongFields.push("t");
  if (!checks[2]) wrongFields.push("Vx");
  setFeedback(`Revise seus cálculos em ${wrongFields.join(", ")}. Comece por Torricelli usando a altura máxima e depois recalcule o tempo total e Vx.`, "error");
  setStatus("Revise as equações");
}

launchButton.addEventListener("click", resetLaunchState);
measureButton.addEventListener("click", toggleMeasures);
verifyButton.addEventListener("click", verifyAnswers);
toggleHeight.addEventListener("change", drawScene);
toggleDistance.addEventListener("change", drawScene);

canvas.addEventListener("pointerdown", (event) => {
  if (state.isAnimating) return;

  const metrics = getLayoutMetrics();
  const rect = canvas.getBoundingClientRect();
  const canvasX = event.clientX - rect.left;
  const canvasY = event.clientY - rect.top;
  const groundY = metrics.plotBottom;
  const fixedOrigin = worldToCanvas(0, 0, metrics);

  if (Math.abs(canvasX - fixedOrigin.x) > 42 || Math.abs(canvasY - groundY) > 42) return;

  if (state.completed || state.scenario) {
    resetLaunchState();
  }

  state.isAiming = true;
  state.pendingOrigin = { x: 0 };
  state.aimStart = fixedOrigin;
  state.aimCurrent = fixedOrigin;

  canvas.setPointerCapture(event.pointerId);
  setStatus("Arraste para definir direção e intensidade");
  drawScene();
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.isAiming || !state.aimStart) return;

  const rect = canvas.getBoundingClientRect();
  const canvasX = event.clientX - rect.left;
  const canvasY = event.clientY - rect.top;
  const maxDragX = state.aimStart.x + MAX_VX * 18;
  const maxDragY = state.aimStart.y - MAX_V0Y * 18;
  state.aimCurrent = {
    x: clamp(canvasX, state.aimStart.x + MIN_VX * 18, maxDragX),
    y: clamp(canvasY, maxDragY, state.aimStart.y - MIN_V0Y * 18)
  };
  drawScene();
});

function finishAim(event) {
  if (!state.isAiming || !state.aimStart || !state.aimCurrent || !state.pendingOrigin) return;

  const dx = state.aimCurrent.x - state.aimStart.x;
  const dy = state.aimStart.y - state.aimCurrent.y;
  const vx = clamp(dx / 18, MIN_VX, MAX_VX);
  const v0y = clamp(dy / 18, MIN_V0Y, MAX_V0Y);

  if (event && typeof event.pointerId === "number") {
    canvas.releasePointerCapture(event.pointerId);
  }

  startLaunchFromAim(state.pendingOrigin.x, vx, v0y);
}

canvas.addEventListener("pointerup", finishAim);
canvas.addEventListener("pointercancel", () => {
  state.isAiming = false;
  state.aimStart = null;
  state.aimCurrent = null;
  state.pendingOrigin = null;
  setStatus("Clique no chão e arraste para lançar");
  drawScene();
});

window.addEventListener("resize", () => {
  state.needsResize = true;
  drawScene();
});

resetLaunchState();
resizeCanvas();
