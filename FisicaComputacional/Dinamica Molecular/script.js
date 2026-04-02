const canvas = document.getElementById("simulation");
const ctx = canvas.getContext("2d");
const temperatureSlider = document.getElementById("temperature");
const temperatureValue = document.getElementById("temperature-value");
const cutoffSlider = document.getElementById("cutoff");
const cutoffValue = document.getElementById("cutoff-value");
const particleSlider = document.getElementById("particle-slider");
const particleSliderValue = document.getElementById("particle-slider-value");
const potentialButtons = [...document.querySelectorAll(".potential-card")];
const feedbackTitle = document.getElementById("feedback-title");
const feedbackEquation = document.getElementById("feedback-equation");
const feedbackText = document.getElementById("feedback-text");
const kineticEnergyValue = document.getElementById("kinetic-energy");
const systemStateValue = document.getElementById("system-state");
const cutoffMetricValue = document.getElementById("cutoff-metric");
const cutoffHint = document.getElementById("cutoff-hint");
const particleCountValue = document.getElementById("particle-count");
const computationalCostValue = document.getElementById("computational-cost");
const computationalCostBar = document.getElementById("computational-cost-bar");
const computationalCostContainer = document.querySelector(".computational-cost");
const dftToggle = document.getElementById("dft-toggle");
const MAX_PARTICLE_COUNT = Number(particleSlider.max);

const BOX_SIZE = 640;
const DEFAULT_PARTICLE_COUNT = 36;
const LJ_SIGMA = 16;
const LJ_EPSILON = 0.085;
const LJ_DT = 0.16;
const LJ_FORCE_CAP = 0.35;
const LJ_MAX_SPEED = 2.8;
const LJ_MIN_DISTANCE = 0.82 * LJ_SIGMA;
const REPULSIVE_SIGMA = LJ_SIGMA;
const REPULSIVE_RANGE_MULTIPLIER = 10;
const REPULSIVE_EPSILON = 10.5;
const REPULSIVE_FORCE_CAP = 112.5;
const REPULSIVE_MAX_DISTANCE = 2.6 * REPULSIVE_SIGMA * REPULSIVE_RANGE_MULTIPLIER;
const FRICTION = 0.006;
const TEMPERATURE_SCALE = 0.013;

const potentialInfo = {
  repulsive: {
    title: "Potencial Repulsivo",
    equation: "V(r) = 4ε(σ/r)^3",
    text: "Este potencial é puramente repulsivo, mas com alcance maior do que uma parede dura. As partículas passam a sentir a presença umas das outras antes do contato direto.",
    cutoffHint: "No potencial repulsivo de longo alcance, o cutoff controla até onde essa repulsão suave continua sendo calculada."
  },
  hardSphere: {
    title: "Esferas Duras",
    equation: "V(r) = ∞, se r < σ; V(r) = 0, se r ≥ σ.",
    text: "Neste regime, os átomos são tratados como objetos rígidos. Não existe atração: apenas colisões elásticas que conservam momento linear e redistribuem energia cinética entre as partículas.",
    cutoffHint: "Para esferas duras, o contato relevante é essencialmente o diâmetro de colisão. O slider permanece visível para comparação, mas o regime continua dominado por contato direto."
  },
  lennardJones: {
    title: "Lennard-Jones",
    equation: "V(r) = 4ε[(σ/r)^12 - (σ/r)^6]",
    text: "O potencial de Lennard-Jones combina uma atração suave a médias distâncias, associada às forças de Van der Waals, com uma repulsão muito forte a curtas distâncias, que representa o efeito de exclusão de Pauli. Em temperaturas baixas, isso favorece aglomerados e estruturas mais ordenadas.",
    cutoffHint: "O cutoff define a distância máxima em que o potencial ainda é calculado. Valores maiores aumentam o alcance da atração entre partículas."
  }
};

const state = {
  width: BOX_SIZE,
  height: BOX_SIZE,
  particles: [],
  pointer: { x: 0, y: 0, active: false },
  draggingId: null,
  potential: "repulsive",
  targetTemperature: Number(temperatureSlider.value),
  cutoffSigma: Number(cutoffSlider.value),
  particleCount: Number(particleSlider.value),
  activeInteractions: 0,
  evaluatedPairs: 0,
  dftMode: false,
  lastPhysicsStepAt: 0
};

const BASE_PARTICLE_RADIUS = 9;

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createParticle(index) {
  const isProbe = index === 0;
  const radius = BASE_PARTICLE_RADIUS;
  return {
    id: index,
    x: randomInRange(radius + 20, BOX_SIZE - radius - 20),
    y: randomInRange(radius + 20, BOX_SIZE - radius - 20),
    vx: randomInRange(-0.8, 0.8),
    vy: randomInRange(-0.8, 0.8),
    fx: 0,
    fy: 0,
    radius,
    mass: isProbe ? 3.2 : 3.2,
    color: isProbe ? "#0d8cff" : "#22303d",
    glow: isProbe ? "rgba(18, 194, 255, 0.38)" : "transparent",
    isProbe
  };
}

function seedParticles() {
  state.particles = [];
  for (let i = 0; i < state.particleCount; i += 1) {
    const particle = createParticle(i);
    let tries = 0;
    while (tries < 400 && overlapsExisting(particle)) {
      particle.x = randomInRange(particle.radius + 20, BOX_SIZE - particle.radius - 20);
      particle.y = randomInRange(particle.radius + 20, BOX_SIZE - particle.radius - 20);
      tries += 1;
    }
    state.particles.push(particle);
  }
}

function overlapsExisting(candidate) {
  return state.particles.some((particle) => {
    const dx = particle.x - candidate.x;
    const dy = particle.y - candidate.y;
    const minDistance = particle.radius + candidate.radius + 3;
    return dx * dx + dy * dy < minDistance * minDistance;
  });
}

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.floor(wrap.clientWidth);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.setTransform(dpr * (size / BOX_SIZE), 0, 0, dpr * (size / BOX_SIZE), 0, 0);
  state.width = BOX_SIZE;
  state.height = BOX_SIZE;
}

function updateTemperatureLabel() {
  temperatureValue.textContent = `${state.targetTemperature}%`;
}

function updateCutoffLabel() {
  const label = `${state.cutoffSigma.toFixed(2)}σ`;
  cutoffValue.textContent = label;
  cutoffMetricValue.textContent = label;
}

function updateParticleLabel() {
  const label = String(state.particleCount);
  particleSliderValue.textContent = label;
  particleCountValue.textContent = label;
}

function updateComputationalCost() {
  const maxInteractions = Math.max((MAX_PARTICLE_COUNT * (MAX_PARTICLE_COUNT - 1)) / 2, 1);
  const ratio = state.dftMode ? 1 : clamp(state.activeInteractions / maxInteractions, 0, 1);
  const red = Math.round(42 + ratio * 213);
  const green = Math.round(180 - ratio * 108);
  computationalCostBar.style.width = `${ratio * 100}%`;
  if (!state.dftMode) {
    computationalCostBar.style.backgroundColor = `rgb(${red}, ${green}, 88)`;
  }
  computationalCostContainer.classList.toggle("is-burning", state.dftMode);
  computationalCostValue.textContent = state.dftMode
    ? "DFT · supercomputando"
    : `${Math.round(ratio * 100)}% · ${state.activeInteractions} interações`;
}

function setPotential(nextPotential) {
  state.potential = nextPotential;
  potentialButtons.forEach((button) => {
    const isActive = button.dataset.potential === nextPotential;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
  feedbackTitle.textContent = potentialInfo[nextPotential].title;
  feedbackEquation.textContent = potentialInfo[nextPotential].equation;
  feedbackText.textContent = potentialInfo[nextPotential].text;
  cutoffHint.textContent = potentialInfo[nextPotential].cutoffHint;
  updateComputationalCost();
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = BOX_SIZE / rect.width;
  const scaleY = BOX_SIZE / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function startDrag(event) {
  const point = pointerPosition(event);
  state.pointer = { ...point, active: true };

  for (const particle of state.particles) {
    const dx = particle.x - point.x;
    const dy = particle.y - point.y;
    if (Math.hypot(dx, dy) <= particle.radius + 5 && particle.isProbe) {
      state.draggingId = particle.id;
      canvas.style.cursor = "grabbing";
      particle.vx = 0;
      particle.vy = 0;
      return;
    }
  }
}

function movePointer(event) {
  const point = pointerPosition(event);
  state.pointer = { ...point, active: true };
  const probe = state.particles[0];
  const hoverDistance = Math.hypot(probe.x - point.x, probe.y - point.y);
  canvas.style.cursor = hoverDistance <= probe.radius + 6 || state.draggingId !== null ? "pointer" : "default";
}

function stopDrag() {
  state.pointer.active = false;
  state.draggingId = null;
  canvas.style.cursor = "default";
}

function applyWallBounce(particle) {
  if (particle.x - particle.radius < 0) {
    particle.x = particle.radius;
    particle.vx *= -1;
  } else if (particle.x + particle.radius > state.width) {
    particle.x = state.width - particle.radius;
    particle.vx *= -1;
  }

  if (particle.y - particle.radius < 0) {
    particle.y = particle.radius;
    particle.vy *= -1;
  } else if (particle.y + particle.radius > state.height) {
    particle.y = state.height - particle.radius;
    particle.vy *= -1;
  }
}

function applyThermostat() {
  if (state.draggingId !== null) {
    return;
  }

  const movableParticles = state.particles.filter((particle) => !particle.isProbe);
  let totalSpeedSq = 0;
  for (const particle of movableParticles) {
    totalSpeedSq += particle.vx * particle.vx + particle.vy * particle.vy;
  }

  const targetSpeed = state.targetTemperature * TEMPERATURE_SCALE;
  const currentRms = movableParticles.length ? Math.sqrt(totalSpeedSq / movableParticles.length) : 0;

  if (targetSpeed === 0) {
    for (const particle of state.particles) {
      particle.vx *= 0.9;
      particle.vy *= 0.9;
      if (Math.abs(particle.vx) < 0.002) particle.vx = 0;
      if (Math.abs(particle.vy) < 0.002) particle.vy = 0;
    }
    return;
  }

  if (currentRms === 0) {
    for (const particle of movableParticles) {
      const angle = Math.random() * Math.PI * 2;
      particle.vx = Math.cos(angle) * targetSpeed;
      particle.vy = Math.sin(angle) * targetSpeed;
    }
    return;
  }

  const scale = 1 + clamp((targetSpeed - currentRms) * 0.03, -0.045, 0.045);
  for (const particle of movableParticles) {
    particle.vx *= scale;
    particle.vy *= scale;
  }
}

function resolveHardSphereCollisions() {
  const particles = state.particles;
  let interactions = 0;
  let evaluatedPairs = 0;
  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i];
      const b = particles[j];

      if (state.draggingId !== null && (a.id === state.draggingId || b.id === state.draggingId)) {
        continue;
      }

      evaluatedPairs += 1;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.0001;
      const minDistance = a.radius + b.radius;

      if (distance >= minDistance) {
        continue;
      }

      interactions += 1;

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      const correction = overlap / 2;

      a.x -= nx * correction;
      a.y -= ny * correction;
      b.x += nx * correction;
      b.y += ny * correction;

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velocityAlongNormal = rvx * nx + rvy * ny;

      if (velocityAlongNormal > 0) {
        continue;
      }

      const impulse = (-2 * velocityAlongNormal) / (1 / a.mass + 1 / b.mass);
      a.vx -= (impulse * nx) / a.mass;
      a.vy -= (impulse * ny) / a.mass;
      b.vx += (impulse * nx) / b.mass;
      b.vy += (impulse * ny) / b.mass;
    }
  }
  state.activeInteractions = interactions;
  state.evaluatedPairs = evaluatedPairs;
}

function applyLennardJonesForces() {
  const cutoffDistance = state.cutoffSigma * LJ_SIGMA;
  const cutoffSq = cutoffDistance * cutoffDistance;
  let interactions = 0;
  let evaluatedPairs = 0;

  for (const particle of state.particles) {
    particle.fx = 0;
    particle.fy = 0;
  }

  for (let i = 0; i < state.particles.length; i += 1) {
    for (let j = i + 1; j < state.particles.length; j += 1) {
      const a = state.particles[i];
      const b = state.particles[j];

      if (state.draggingId !== null && (a.id === state.draggingId || b.id === state.draggingId)) {
        continue;
      }

      evaluatedPairs += 1;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq === 0 || distanceSq > cutoffSq) {
        continue;
      }

      interactions += 1;

      const distance = Math.sqrt(distanceSq);
      const repulsiveMinDistance = 0.82 * REPULSIVE_SIGMA;
      const softenedDistance = Math.max(distance, repulsiveMinDistance);
      const invR = 1 / softenedDistance;
      const sr = REPULSIVE_SIGMA * invR;
      const sr2 = sr * sr;
      const sr6 = sr2 * sr2 * sr2;
      const sr12 = sr6 * sr6;
      const scalar = (24 * LJ_EPSILON * (2 * sr12 - sr6)) / softenedDistance;
      const unitX = dx / softenedDistance;
      const unitY = dy / softenedDistance;
      const cappedScalar = clamp(scalar, -LJ_FORCE_CAP, LJ_FORCE_CAP);
      const fx = cappedScalar * unitX;
      const fy = cappedScalar * unitY;

      if (distance < a.radius + b.radius) {
        const overlap = a.radius + b.radius - distance;
        const push = overlap * 0.02;
        a.x -= unitX * push;
        a.y -= unitY * push;
        b.x += unitX * push;
        b.y += unitY * push;
      }

      a.fx -= fx;
      a.fy -= fy;
      b.fx += fx;
      b.fy += fy;
    }
  }
  state.activeInteractions = interactions;
  state.evaluatedPairs = evaluatedPairs;
}

function applyRepulsiveForces() {
  const cutoffDistance = Math.min(state.cutoffSigma * REPULSIVE_SIGMA, REPULSIVE_MAX_DISTANCE);
  const cutoffSq = cutoffDistance * cutoffDistance;
  const repulsiveMinDistance = 0.82 * REPULSIVE_SIGMA;
  let interactions = 0;
  let evaluatedPairs = 0;

  for (const particle of state.particles) {
    particle.fx = 0;
    particle.fy = 0;
  }

  for (let i = 0; i < state.particles.length; i += 1) {
    for (let j = i + 1; j < state.particles.length; j += 1) {
      const a = state.particles[i];
      const b = state.particles[j];

      if (state.draggingId !== null && (a.id === state.draggingId || b.id === state.draggingId)) {
        continue;
      }

      evaluatedPairs += 1;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq === 0 || distanceSq > cutoffSq) {
        continue;
      }

      interactions += 1;

      const distance = Math.sqrt(distanceSq);
      const softenedDistance = Math.max(distance, repulsiveMinDistance);
      const invR = 1 / softenedDistance;
      const sr = REPULSIVE_SIGMA * invR;
      const sr3 = sr * sr * sr;
      const scalar = (12 * REPULSIVE_EPSILON * sr3) / softenedDistance;
      const unitX = dx / softenedDistance;
      const unitY = dy / softenedDistance;
      const cappedScalar = Math.min(scalar, REPULSIVE_FORCE_CAP);
      const fx = cappedScalar * unitX;
      const fy = cappedScalar * unitY;

      if (distance < a.radius + b.radius) {
        const overlap = a.radius + b.radius - distance;
        const push = overlap * 0.18;
        a.x -= unitX * push;
        a.y -= unitY * push;
        b.x += unitX * push;
        b.y += unitY * push;
      }

      a.fx -= fx;
      a.fy -= fy;
      b.fx += fx;
      b.fy += fy;
    }
  }
  state.activeInteractions = interactions;
  state.evaluatedPairs = evaluatedPairs;
}

function integrate() {
  state.activeInteractions = 0;
  state.evaluatedPairs = 0;
  if (state.potential === "lennardJones") {
    applyLennardJonesForces();
  } else if (state.potential === "repulsive") {
    applyRepulsiveForces();
  }

  for (const particle of state.particles) {
    if (particle.id === state.draggingId) {
      particle.x = clamp(state.pointer.x, particle.radius, state.width - particle.radius);
      particle.y = clamp(state.pointer.y, particle.radius, state.height - particle.radius);
      particle.vx = 0;
      particle.vy = 0;
      continue;
    }

    if (state.potential === "lennardJones" || state.potential === "repulsive") {
      particle.vx += (particle.fx / particle.mass) * LJ_DT;
      particle.vy += (particle.fy / particle.mass) * LJ_DT;
      particle.vx *= 1 - FRICTION;
      particle.vy *= 1 - FRICTION;
      particle.vx = clamp(particle.vx, -LJ_MAX_SPEED, LJ_MAX_SPEED);
      particle.vy = clamp(particle.vy, -LJ_MAX_SPEED, LJ_MAX_SPEED);
    }

    particle.x += particle.vx;
    particle.y += particle.vy;
    applyWallBounce(particle);
  }

  if (state.potential === "hardSphere") {
    resolveHardSphereCollisions();
  }
}

function systemStateLabel(temperature) {
  if (temperature === 0) return "Congelado";
  if (temperature < 20) return "Frio";
  if (temperature < 60) return "Moderado";
  if (temperature < 85) return "Agitado";
  return "Muito energético";
}

function updateMetrics() {
  let totalKinetic = 0;
  for (const particle of state.particles) {
    totalKinetic += 0.5 * particle.mass * (particle.vx * particle.vx + particle.vy * particle.vy);
  }
  kineticEnergyValue.textContent = totalKinetic.toFixed(2);
  systemStateValue.textContent = systemStateLabel(state.targetTemperature);
  particleCountValue.textContent = String(state.particles.length);
  updateComputationalCost();
}

function drawBackground() {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = "#f4f8fb";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.strokeStyle = "rgba(23, 32, 43, 0.06)";
  ctx.lineWidth = 1;
  for (let offset = 28; offset < state.width; offset += 28) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, state.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(state.width, offset);
    ctx.stroke();
  }
}

function drawProbeConnections() {
  const probe = state.particles.find((particle) => particle.isProbe);
  if (!probe) {
    return;
  }

  const ljCutoffDistance = state.cutoffSigma * LJ_SIGMA;
  const repulsiveCutoffDistance = Math.min(state.cutoffSigma * REPULSIVE_SIGMA, REPULSIVE_MAX_DISTANCE);

  for (const particle of state.particles) {
    if (particle.id === probe.id) {
      continue;
    }

    const dx = particle.x - probe.x;
    const dy = particle.y - probe.y;
    const distance = Math.hypot(dx, dy);

    let interacts = false;
    let alpha = 0;

    if (state.potential === "lennardJones" && distance <= ljCutoffDistance) {
      interacts = true;
      alpha = clamp(1 - distance / ljCutoffDistance, 0.12, 0.45);
    }

    if (state.potential === "repulsive" && distance <= repulsiveCutoffDistance) {
      interacts = true;
      alpha = clamp(1 - distance / repulsiveCutoffDistance, 0.1, 0.35);
    }

    if (state.potential === "hardSphere") {
      const contactDistance = probe.radius + particle.radius + 2;
      if (distance <= contactDistance) {
        interacts = true;
        alpha = 0.35;
      }
    }

    if (!interacts) {
      continue;
    }

    ctx.save();
    ctx.strokeStyle = `rgba(255, 72, 72, ${alpha})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(probe.x, probe.y);
    ctx.lineTo(particle.x, particle.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    if (particle.isProbe) {
      ctx.save();
      ctx.shadowBlur = 24;
      ctx.shadowColor = particle.glow;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(18, 194, 255, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    ctx.fillStyle = particle.color;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function frame() {
  const now = performance.now();
  const shouldAdvancePhysics = !state.dftMode || now - state.lastPhysicsStepAt >= 3000;

  if (shouldAdvancePhysics) {
    applyThermostat();
    integrate();
    state.lastPhysicsStepAt = now;
  }

  drawBackground();
  drawProbeConnections();
  drawParticles();
  updateMetrics();
  requestAnimationFrame(frame);
}

temperatureSlider.addEventListener("input", (event) => {
  state.targetTemperature = Number(event.target.value);
  updateTemperatureLabel();
});

cutoffSlider.addEventListener("input", (event) => {
  state.cutoffSigma = Number(event.target.value);
  updateCutoffLabel();
});

particleSlider.addEventListener("input", (event) => {
  state.particleCount = Number(event.target.value);
  updateParticleLabel();
  seedParticles();
  updateComputationalCost();
});

dftToggle.addEventListener("click", () => {
  state.dftMode = !state.dftMode;
  state.lastPhysicsStepAt = 0;
  dftToggle.classList.toggle("is-active", state.dftMode);
  dftToggle.setAttribute("aria-pressed", String(state.dftMode));
  dftToggle.textContent = state.dftMode ? "Desligar física quântica (DFT)" : "Ligar física quântica (DFT)";
  updateComputationalCost();
});

potentialButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setPotential(button.dataset.potential);
  });
});

canvas.addEventListener("pointerdown", startDrag);
canvas.addEventListener("pointermove", movePointer);
canvas.addEventListener("pointerleave", () => {
  if (state.draggingId === null) {
    canvas.style.cursor = "default";
  }
});
window.addEventListener("pointerup", stopDrag);
window.addEventListener("resize", resizeCanvas);

seedParticles();
resizeCanvas();
setPotential(state.potential);
updateTemperatureLabel();
updateCutoffLabel();
updateParticleLabel();
updateMetrics();
frame();
