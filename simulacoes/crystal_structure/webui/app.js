(function () {
  const structures = window.STRUCTURE_LIBRARY || {};
  const structureKeys = Object.keys(structures);

  const structureButtons = document.getElementById("structure-buttons");
  const openCompareButton = document.getElementById("open-compare");
  const compareModal = document.getElementById("compare-modal");
  const closeCompareButton = document.getElementById("close-compare");
  const resetCompareButton = document.getElementById("reset-compare");
  const planesPanel = document.getElementById("planes-panel");
  const graphenePlanePanel = document.getElementById("graphene-plane-panel");
  const showGraphenePlaneInput = document.getElementById("show-graphene-plane");
  const planeButtons = document.getElementById("plane-buttons");
  const showBondsInput = document.getElementById("show-bonds");
  const resetButton = document.getElementById("reset-view");
  const descriptionEl = document.getElementById("structure-description");
  const viewerTitle = document.getElementById("viewer-title");
  const viewerSubtitle = document.getElementById("viewer-subtitle");
  const canvas = document.getElementById("viewer");
  const ctx = canvas.getContext("2d");
  const compareCanvases = {
    sc: document.getElementById("compare-sc"),
    bcc: document.getElementById("compare-bcc"),
    fcc: document.getElementById("compare-fcc")
  };
  const compareContexts = Object.fromEntries(
    Object.entries(compareCanvases).map(([key, value]) => [key, value.getContext("2d")])
  );

  const palette = {
    X: "#5dd4ff",
    C: "#f2f2f2",
    Zn: "#6ab7ff",
    S: "#ffd166"
  };
  const SPACING_SCALE = 4;

  const state = {
    structureKey: structureKeys[0] || null,
    rotationX: -0.55,
    rotationY: 0.75,
    zoom: 1,
    dragging: false,
    lastX: 0,
    lastY: 0,
    activePlane: null,
    showGraphenePlane: true,
    prepared: null
  };
  const compareState = {
    open: false,
    rotationX: -0.55,
    rotationY: 0.75,
    zoom: 0.92,
    dragging: false,
    lastX: 0,
    lastY: 0,
    activeCanvas: null,
    prepared: {}
  };

  const BOX_EDGES = [
    [0, 1], [0, 2], [0, 4],
    [1, 3], [1, 5],
    [2, 3], [2, 6],
    [3, 7],
    [4, 5], [4, 6],
    [5, 7],
    [6, 7]
  ];

  function expandStructure(structure, repeatsOverride) {
    const repeats = repeatsOverride || structure.repeats || [1, 1, 1];
    const lattice = structure.lattice || [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    const expanded = [];

    for (let i = 0; i < repeats[0]; i += 1) {
      for (let j = 0; j < repeats[1]; j += 1) {
        for (let k = 0; k < repeats[2]; k += 1) {
          const tx = i * lattice[0][0] + j * lattice[1][0] + k * lattice[2][0];
          const ty = i * lattice[0][1] + j * lattice[1][1] + k * lattice[2][1];
          const tz = i * lattice[0][2] + j * lattice[1][2] + k * lattice[2][2];

          structure.atoms.forEach(([label, x, y, z]) => {
            expanded.push([
              label,
              (x + tx) * SPACING_SCALE,
              (y + ty) * SPACING_SCALE,
              (z + tz) * SPACING_SCALE
            ]);
          });
        }
      }
    }

    return expanded;
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function makePairKey(labelA, labelB) {
    return [labelA, labelB].sort().join(":");
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function normalize(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
  }

  function invertMatrix3(columns) {
    const a = columns[0];
    const b = columns[1];
    const c = columns[2];
    const det = dot(a, cross(b, c)) || 1;
    return [
      { x: cross(b, c).x / det, y: cross(b, c).y / det, z: cross(b, c).z / det },
      { x: cross(c, a).x / det, y: cross(c, a).y / det, z: cross(c, a).z / det },
      { x: cross(a, b).x / det, y: cross(a, b).y / det, z: cross(a, b).z / det }
    ];
  }

  function cartToFractional(vector, inverseColumns) {
    return {
      x: dot(vector, inverseColumns[0]),
      y: dot(vector, inverseColumns[1]),
      z: dot(vector, inverseColumns[2])
    };
  }

  function fractionalToCart(frac, columns) {
    return {
      x: frac.x * columns[0].x + frac.y * columns[1].x + frac.z * columns[2].x,
      y: frac.x * columns[0].y + frac.y * columns[1].y + frac.z * columns[2].y,
      z: frac.x * columns[0].z + frac.y * columns[1].z + frac.z * columns[2].z
    };
  }

  function buildPeriodicGeometry(structure) {
    const lattice = structure.lattice || [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const repeats = structure.repeats || [1, 1, 1];
    const columns = [
      { x: lattice[0][0] * repeats[0] * SPACING_SCALE, y: lattice[0][1] * repeats[0] * SPACING_SCALE, z: lattice[0][2] * repeats[0] * SPACING_SCALE },
      { x: lattice[1][0] * repeats[1] * SPACING_SCALE, y: lattice[1][1] * repeats[1] * SPACING_SCALE, z: lattice[1][2] * repeats[1] * SPACING_SCALE },
      { x: lattice[2][0] * repeats[2] * SPACING_SCALE, y: lattice[2][1] * repeats[2] * SPACING_SCALE, z: lattice[2][2] * repeats[2] * SPACING_SCALE }
    ];
    return {
      columns,
      inverseColumns: invertMatrix3(columns),
      periodic: repeats.map((repeat) => repeat > 1)
    };
  }

  function periodicDistance(a, b, periodicGeometry) {
    if (!periodicGeometry) {
      return { distance: distance(a, b), wrapped: false };
    }

    const displacement = subtract(a, b);
    const frac = cartToFractional(displacement, periodicGeometry.inverseColumns);
    const wrappedFractions = {
      x: periodicGeometry.periodic[0] ? Math.round(frac.x) : 0,
      y: periodicGeometry.periodic[1] ? Math.round(frac.y) : 0,
      z: periodicGeometry.periodic[2] ? Math.round(frac.z) : 0
    };
    const wrapped = {
      x: periodicGeometry.periodic[0] ? frac.x - wrappedFractions.x : frac.x,
      y: periodicGeometry.periodic[1] ? frac.y - wrappedFractions.y : frac.y,
      z: periodicGeometry.periodic[2] ? frac.z - wrappedFractions.z : frac.z
    };
    const cart = fractionalToCart(wrapped, periodicGeometry.columns);
    return {
      distance: Math.hypot(cart.x, cart.y, cart.z),
      wrapped: wrappedFractions.x !== 0 || wrappedFractions.y !== 0 || wrappedFractions.z !== 0
    };
  }

  function getPlaneNormal(plane, structure) {
    if (plane.normal) {
      return normalize({ x: plane.normal[0], y: plane.normal[1], z: plane.normal[2] });
    }

    const [h, k, l] = plane.miller;
    const lattice = structure.lattice || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const a1 = { x: lattice[0][0], y: lattice[0][1], z: lattice[0][2] };
    const a2 = { x: lattice[1][0], y: lattice[1][1], z: lattice[1][2] };
    const a3 = { x: lattice[2][0], y: lattice[2][1], z: lattice[2][2] };
    const cellVolume = dot(a1, cross(a2, a3)) || 1;
    const b1 = { x: cross(a2, a3).x / cellVolume, y: cross(a2, a3).y / cellVolume, z: cross(a2, a3).z / cellVolume };
    const b2 = { x: cross(a3, a1).x / cellVolume, y: cross(a3, a1).y / cellVolume, z: cross(a3, a1).z / cellVolume };
    const b3 = { x: cross(a1, a2).x / cellVolume, y: cross(a1, a2).y / cellVolume, z: cross(a1, a2).z / cellVolume };

    return normalize({
      x: h * b1.x + k * b2.x + l * b3.x,
      y: h * b1.y + k * b2.y + l * b3.y,
      z: h * b1.z + k * b2.z + l * b3.z
    });
  }

  function inferBonds(points, structure, periodicGeometry) {
    if (points.length < 2) {
      return [];
    }

    const bonding = structure && structure.bonding;
    const coordination = bonding && bonding.coordination ? bonding.coordination : Infinity;
    const strategy = bonding && bonding.strategy ? bonding.strategy : "distance-shell";
    const allowedPairs = new Set(
      ((bonding && bonding.allowedPairs) || []).map(([a, b]) => makePairKey(a, b))
    );

    if (strategy === "mutual-nearest" && Number.isFinite(coordination)) {
      const neighborLists = points.map(() => []);
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          if (allowedPairs.size > 0 && !allowedPairs.has(makePairKey(points[i].label, points[j].label))) {
            continue;
          }
          const result = periodicDistance(points[i], points[j], periodicGeometry);
          neighborLists[i].push([j, result.distance, result.wrapped]);
          neighborLists[j].push([i, result.distance, result.wrapped]);
        }
      }

      const nearestSets = neighborLists.map((list) =>
        new Set(
          list
            .sort((a, b) => a[1] - b[1])
            .slice(0, coordination)
            .map(([index]) => index)
        )
      );
      const neighborMap = neighborLists.map((list) => new Map(list.map(([index, d, wrapped]) => [index, { d, wrapped }])));

      const bonds = [];
      for (let i = 0; i < points.length; i += 1) {
        nearestSets[i].forEach((j) => {
          const pairInfo = neighborMap[i].get(j);
          if (j > i && nearestSets[j].has(i) && pairInfo && !pairInfo.wrapped) {
            bonds.push([i, j]);
          }
        });
      }
      return bonds;
    }

    let minDistance = Infinity;
    const candidatePairs = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        if (allowedPairs.size > 0 && !allowedPairs.has(makePairKey(points[i].label, points[j].label))) {
          continue;
        }
        const result = periodicDistance(points[i], points[j], periodicGeometry);
        if (result.distance > 1e-6 && result.distance < minDistance) {
          minDistance = result.distance;
        }
        candidatePairs.push([i, j, result.distance, result.wrapped]);
      }
    }

    if (!Number.isFinite(minDistance)) {
      return [];
    }

    const threshold = minDistance * 1.18;
    candidatePairs.sort((a, b) => a[2] - b[2]);
    const degrees = Array(points.length).fill(0);
    const bonds = [];
    for (const [i, j, d, wrapped] of candidatePairs) {
      if (d > threshold) {
        break;
      }
      if (degrees[i] >= coordination || degrees[j] >= coordination) {
        continue;
      }
      if (wrapped) {
        continue;
      }
      bonds.push([i, j]);
      degrees[i] += 1;
      degrees[j] += 1;
    }
    return bonds;
  }

  function buildPlanePolygon(centeredPoints, scale, structure, plane) {
    if (!plane) {
      return null;
    }

    const xs = centeredPoints.map((point) => point.x);
    const ys = centeredPoints.map((point) => point.y);
    const zs = centeredPoints.map((point) => point.z);
    const min = { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) };
    const max = { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) };
    const corners = [
      { x: min.x, y: min.y, z: min.z },
      { x: max.x, y: min.y, z: min.z },
      { x: min.x, y: max.y, z: min.z },
      { x: max.x, y: max.y, z: min.z },
      { x: min.x, y: min.y, z: max.z },
      { x: max.x, y: min.y, z: max.z },
      { x: min.x, y: max.y, z: max.z },
      { x: max.x, y: max.y, z: max.z }
    ];

    const normal = getPlaneNormal(plane, structure);
    const points = [];
    BOX_EDGES.forEach(([ia, ib]) => {
      const a = corners[ia];
      const b = corners[ib];
      const da = dot(normal, a);
      const db = dot(normal, b);
      const denom = da - db;
      if (Math.abs(denom) < 1e-8) {
        return;
      }

      const t = da / (da - db);
      if (t < -1e-8 || t > 1 + 1e-8) {
        return;
      }

      const point = {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t
      };
      const exists = points.some((item) =>
        Math.abs(item.x - point.x) < 1e-6 &&
        Math.abs(item.y - point.y) < 1e-6 &&
        Math.abs(item.z - point.z) < 1e-6
      );
      if (!exists) {
        points.push(point);
      }
    });

    if (points.length < 3) {
      return null;
    }

    const centroid = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
      z: acc.z + point.z
    }), { x: 0, y: 0, z: 0 });
    centroid.x /= points.length;
    centroid.y /= points.length;
    centroid.z /= points.length;

    const reference = Math.abs(normal.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
    const u = normalize(cross(reference, normal));
    const v = normalize(cross(normal, u));

    return points
      .map((point) => {
        const rel = { x: point.x - centroid.x, y: point.y - centroid.y, z: point.z - centroid.z };
        return {
          x: point.x * scale,
          y: point.y * scale,
          z: point.z * scale,
          angle: Math.atan2(dot(rel, v), dot(rel, u))
        };
      })
      .sort((a, b) => a.angle - b.angle)
      .map(({ angle, ...point }) => point);
  }

  function buildGraphenePlane(centeredPoints, scale) {
    const xs = centeredPoints.map((point) => point.x);
    const ys = centeredPoints.map((point) => point.y);
    const zs = centeredPoints.map((point) => point.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const avgZ = zs.reduce((sum, value) => sum + value, 0) / zs.length;

    return [
      { x: minX * scale, y: minY * scale, z: avgZ * scale },
      { x: maxX * scale, y: minY * scale, z: avgZ * scale },
      { x: maxX * scale, y: maxY * scale, z: avgZ * scale },
      { x: minX * scale, y: maxY * scale, z: avgZ * scale }
    ];
  }

  function centerAndScale(atoms, structure, activePlane) {
    const rawPoints = atoms.map(([label, x, y, z]) => ({ label, x, y, z }));
    const periodicGeometry = buildPeriodicGeometry(structure);
    const center = rawPoints.reduce((acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      acc.z += point.z;
      return acc;
    }, { x: 0, y: 0, z: 0 });

    center.x /= rawPoints.length || 1;
    center.y /= rawPoints.length || 1;
    center.z /= rawPoints.length || 1;

    const centered = rawPoints.map((point) => ({
      label: point.label,
      x: point.x - center.x,
      y: point.y - center.y,
      z: point.z - center.z
    }));

    let maxRadius = 1;
    centered.forEach((point) => {
      const r = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
      if (r > maxRadius) {
        maxRadius = r;
      }
    });

    const scale = 180 / maxRadius;
    const scaled = centered.map((point) => ({
      label: point.label,
      x: point.x * scale,
      y: point.y * scale,
      z: point.z * scale
    }));

    return {
      points: scaled,
      bonds: inferBonds(centered, structure, periodicGeometry),
      plane: buildPlanePolygon(centered, scale, structure, activePlane),
      graphenePlane: structure.name === "Grafeno" && state.showGraphenePlane
        ? buildGraphenePlane(centered, scale)
        : null
    };
  }

  function resizeCanvas() {
    resizeSingleCanvas(canvas, ctx);
  }

  function resizeSingleCanvas(targetCanvas, targetCtx) {
    const ratio = window.devicePixelRatio || 1;
    const width = targetCanvas.clientWidth;
    const height = targetCanvas.clientHeight;
    targetCanvas.width = Math.round(width * ratio);
    targetCanvas.height = Math.round(height * ratio);
    targetCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function rotatePoint(point, ax, ay) {
    const cosX = Math.cos(ax);
    const sinX = Math.sin(ax);
    const cosY = Math.cos(ay);
    const sinY = Math.sin(ay);

    const y1 = point.y * cosX - point.z * sinX;
    const z1 = point.y * sinX + point.z * cosX;
    const x2 = point.x * cosY + z1 * sinY;
    const z2 = -point.x * sinY + z1 * cosY;

    return {
      label: point.label,
      x: x2,
      y: y1,
      z: z2
    };
  }

  function projectPoint(point, width, height, zoom) {
    return {
      label: point.label,
      x: width / 2 + point.x * zoom,
      y: height / 2 - point.y * zoom,
      z: point.z,
      radius: Math.max(2.5, 6.5 * zoom)
    };
  }

  function prepareStructure(key) {
    const structure = structures[key];
    if (!structure) {
      return;
    }

    const expandedAtoms = expandStructure(structure);
    const repeats = structure.repeats || [1, 1, 1];

    const activePlane = (structure.planes || []).find((plane) => plane.label === state.activePlane) || null;
    state.prepared = centerAndScale(expandedAtoms, structure, activePlane);
    descriptionEl.textContent = `${structure.comment} • supercell ${repeats.join("x")}`;
    viewerTitle.textContent = structure.name;
    viewerSubtitle.textContent = structure.subtitle;
  }

  function drawBackground(width, height) {
    drawBackgroundInto(ctx, width, height);
  }

  function drawBackgroundInto(targetCtx, width, height) {
    targetCtx.clearRect(0, 0, width, height);

    const gradient = targetCtx.createRadialGradient(width * 0.5, height * 0.38, 30, width * 0.5, height * 0.5, width * 0.6);
    gradient.addColorStop(0, "rgba(52, 123, 175, 0.18)");
    gradient.addColorStop(1, "rgba(2, 9, 17, 0)");
    targetCtx.fillStyle = gradient;
    targetCtx.fillRect(0, 0, width, height);

    targetCtx.strokeStyle = "rgba(126, 175, 214, 0.08)";
    targetCtx.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) {
      targetCtx.beginPath();
      targetCtx.moveTo(x, 0);
      targetCtx.lineTo(x, height);
      targetCtx.stroke();
    }
    for (let y = 0; y <= height; y += 48) {
      targetCtx.beginPath();
      targetCtx.moveTo(0, y);
      targetCtx.lineTo(width, y);
      targetCtx.stroke();
    }
  }

  function renderScene(targetCtx, targetCanvas, prepared, rotationX, rotationY, zoom, drawPlane, showBonds) {
    const width = targetCanvas.clientWidth;
    const height = targetCanvas.clientHeight;
    drawBackgroundInto(targetCtx, width, height);

    if (!prepared) {
      return;
    }

    const rotated = prepared.points.map((point) => rotatePoint(point, rotationX, rotationY));
    const projected = rotated.map((point) => projectPoint(point, width, height, zoom));
    const planePolygon = drawPlane && prepared.plane
      ? prepared.plane.map((point) => projectPoint(rotatePoint(point, rotationX, rotationY), width, height, zoom))
      : null;
    const graphenePolygon = drawPlane && prepared.graphenePlane
      ? prepared.graphenePlane.map((point) => projectPoint(rotatePoint(point, rotationX, rotationY), width, height, zoom))
      : null;

    if (planePolygon && planePolygon.length >= 3) {
      const depth = planePolygon.reduce((sum, point) => sum + point.z, 0) / planePolygon.length;
      const opacity = Math.max(0.18, 0.32 - depth * 0.0008);
      targetCtx.fillStyle = `rgba(255, 209, 102, ${opacity})`;
      targetCtx.strokeStyle = "rgba(255, 227, 163, 0.75)";
      targetCtx.lineWidth = Math.max(1.1, 1.6 * zoom);
      targetCtx.beginPath();
      targetCtx.moveTo(planePolygon[0].x, planePolygon[0].y);
      for (let i = 1; i < planePolygon.length; i += 1) {
        targetCtx.lineTo(planePolygon[i].x, planePolygon[i].y);
      }
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.stroke();
    }

    if (graphenePolygon && graphenePolygon.length >= 3) {
      targetCtx.fillStyle = "rgba(93, 212, 255, 0.16)";
      targetCtx.strokeStyle = "rgba(154, 230, 255, 0.6)";
      targetCtx.lineWidth = Math.max(1, 1.4 * zoom);
      targetCtx.beginPath();
      targetCtx.moveTo(graphenePolygon[0].x, graphenePolygon[0].y);
      for (let i = 1; i < graphenePolygon.length; i += 1) {
        targetCtx.lineTo(graphenePolygon[i].x, graphenePolygon[i].y);
      }
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.stroke();
    }

    if (showBonds) {
      prepared.bonds.forEach(([i, j]) => {
        const a = projected[i];
        const b = projected[j];
        const depthShade = Math.max(0.18, 0.7 - ((a.z + b.z) * 0.0015));
        targetCtx.strokeStyle = `rgba(164, 212, 245, ${depthShade})`;
        targetCtx.lineWidth = Math.max(1.1, 1.8 * zoom);
        targetCtx.beginPath();
        targetCtx.moveTo(a.x, a.y);
        targetCtx.lineTo(b.x, b.y);
        targetCtx.stroke();
      });
    }

    projected
      .slice()
      .sort((a, b) => a.z - b.z)
      .forEach((point) => {
        const color = palette[point.label] || "#5dd4ff";
        const glow = targetCtx.createRadialGradient(point.x - point.radius * 0.25, point.y - point.radius * 0.25, 0, point.x, point.y, point.radius * 1.2);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.96)");
        glow.addColorStop(0.3, color);
        glow.addColorStop(1, "rgba(2, 12, 20, 0.94)");

        targetCtx.fillStyle = glow;
        targetCtx.beginPath();
        targetCtx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        targetCtx.fill();

        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();
      });
  }

  function render() {
    renderScene(ctx, canvas, state.prepared, state.rotationX, state.rotationY, state.zoom, true, showBondsInput.checked);
  }

  function prepareCompareStructures() {
    function scaledAtom(x, y, z) {
      return ["X", x * SPACING_SCALE, y * SPACING_SCALE, z * SPACING_SCALE];
    }

    function generateScBlock() {
      return [
        scaledAtom(-0.5, -0.5, -0.5),
        scaledAtom(0.5, -0.5, -0.5),
        scaledAtom(-0.5, 0.5, -0.5),
        scaledAtom(0.5, 0.5, -0.5),
        scaledAtom(-0.5, -0.5, 0.5),
        scaledAtom(0.5, -0.5, 0.5),
        scaledAtom(-0.5, 0.5, 0.5),
        scaledAtom(0.5, 0.5, 0.5)
      ];
    }

    function generateBccBlock() {
      return generateScBlock().concat([scaledAtom(0.0, 0.0, 0.0)]);
    }

    function generateFccBlock() {
      return generateScBlock().concat([
        scaledAtom(0.0, 0.0, -0.5),
        scaledAtom(0.0, 0.0, 0.5),
        scaledAtom(0.0, -0.5, 0.0),
        scaledAtom(0.0, 0.5, 0.0),
        scaledAtom(-0.5, 0.0, 0.0),
        scaledAtom(0.5, 0.0, 0.0)
      ]);
    }

    compareState.prepared.sc = centerAndScale(generateScBlock(), structures.sc, null);
    compareState.prepared.bcc = centerAndScale(generateBccBlock(), structures.bcc, null);
    compareState.prepared.fcc = centerAndScale(generateFccBlock(), structures.fcc, null);

    const scBonds = compareState.prepared.sc.bonds.slice();
    compareState.prepared.bcc.bonds = scBonds.slice();
    compareState.prepared.fcc.bonds = scBonds.slice();
  }

  function renderCompare() {
    if (!compareState.open) {
      return;
    }

    Object.keys(compareCanvases).forEach((key) => {
      renderScene(
        compareContexts[key],
        compareCanvases[key],
        compareState.prepared[key],
        compareState.rotationX,
        compareState.rotationY,
        compareState.zoom,
        false,
        true
      );
    });
  }

  function tick() {
    render();
    renderCompare();
    window.requestAnimationFrame(tick);
  }

  function setActiveStructure(key) {
    state.structureKey = key;
    state.activePlane = null;
    state.showGraphenePlane = true;
    state.rotationX = -0.55;
    state.rotationY = 0.75;
    state.zoom = 1;
    rebuildPlaneButtons();
    prepareStructure(key);
    updateActiveButton();
  }

  function resetView() {
    state.rotationX = -0.55;
    state.rotationY = 0.75;
    state.zoom = 1;
  }

  function resetCompareView() {
    compareState.rotationX = -0.55;
    compareState.rotationY = 0.75;
    compareState.zoom = 0.92;
  }

  function pointerPosition(event) {
    if (event.touches && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }

  function updateActiveButton() {
    const buttons = structureButtons.querySelectorAll(".structure-button");
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.key === state.structureKey);
    });
  }

  function updateActivePlaneButton() {
    const buttons = planeButtons.querySelectorAll(".plane-button");
    buttons.forEach((button) => {
      const isActive = state.activePlane === null
        ? button.dataset.label === ""
        : button.dataset.label === state.activePlane;
      button.classList.toggle("active", isActive);
    });
  }

  function rebuildPlaneButtons() {
    const structure = structures[state.structureKey];
    const planes = (structure && structure.planes) || [];
    planeButtons.innerHTML = "";
    graphenePlanePanel.hidden = state.structureKey !== "graphene";
    showGraphenePlaneInput.checked = state.showGraphenePlane;

    if (!planes.length) {
      planesPanel.hidden = true;
      return;
    }

    planesPanel.hidden = false;

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "plane-button";
    clearButton.dataset.label = "";
    clearButton.textContent = "No plane";
    clearButton.addEventListener("click", () => {
      state.activePlane = null;
      prepareStructure(state.structureKey);
      updateActivePlaneButton();
    });
    planeButtons.appendChild(clearButton);

    planes.forEach((plane) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "plane-button";
      button.dataset.label = plane.label;
      button.textContent = plane.label;
      button.addEventListener("click", () => {
        state.activePlane = plane.label;
        prepareStructure(state.structureKey);
        updateActivePlaneButton();
      });
      planeButtons.appendChild(button);
    });

    updateActivePlaneButton();
  }

  function openCompareModal() {
    compareState.open = true;
    compareModal.hidden = false;
    prepareCompareStructures();
    resetCompareView();
    Object.entries(compareCanvases).forEach(([key, targetCanvas]) => {
      resizeSingleCanvas(targetCanvas, compareContexts[key]);
    });
  }

  function closeCompareModal() {
    compareState.open = false;
    compareModal.hidden = true;
    compareState.dragging = false;
    compareState.activeCanvas = null;
    Object.values(compareCanvases).forEach((targetCanvas) => targetCanvas.classList.remove("dragging"));
  }

  structureKeys.forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "structure-button";
    button.dataset.key = key;
    button.textContent = structures[key].name;
    button.addEventListener("click", () => setActiveStructure(key));
    structureButtons.appendChild(button);
  });

  resetButton.addEventListener("click", resetView);
  showGraphenePlaneInput.addEventListener("change", () => {
    state.showGraphenePlane = showGraphenePlaneInput.checked;
    prepareStructure(state.structureKey);
  });
  openCompareButton.addEventListener("click", openCompareModal);
  closeCompareButton.addEventListener("click", closeCompareModal);
  resetCompareButton.addEventListener("click", resetCompareView);

  canvas.addEventListener("mousedown", (event) => {
    state.dragging = true;
    canvas.classList.add("dragging");
    const pos = pointerPosition(event);
    state.lastX = pos.x;
    state.lastY = pos.y;
  });

  window.addEventListener("mouseup", () => {
    state.dragging = false;
    canvas.classList.remove("dragging");
    compareState.dragging = false;
    compareState.activeCanvas = null;
    Object.values(compareCanvases).forEach((targetCanvas) => targetCanvas.classList.remove("dragging"));
  });

  window.addEventListener("mousemove", (event) => {
    if (!state.dragging) {
      return;
    }
    const pos = pointerPosition(event);
    state.rotationY += (pos.x - state.lastX) * 0.01;
    state.rotationX += (pos.y - state.lastY) * 0.01;
    state.lastX = pos.x;
    state.lastY = pos.y;
  });

  Object.values(compareCanvases).forEach((targetCanvas) => {
    targetCanvas.addEventListener("mousedown", (event) => {
      if (!compareState.open) {
        return;
      }
      compareState.dragging = true;
      compareState.activeCanvas = targetCanvas;
      targetCanvas.classList.add("dragging");
      const pos = pointerPosition(event);
      compareState.lastX = pos.x;
      compareState.lastY = pos.y;
    });
  });

  canvas.addEventListener("touchstart", (event) => {
    state.dragging = true;
    const pos = pointerPosition(event);
    state.lastX = pos.x;
    state.lastY = pos.y;
  }, { passive: true });

  window.addEventListener("touchend", () => {
    state.dragging = false;
    compareState.dragging = false;
    compareState.activeCanvas = null;
    Object.values(compareCanvases).forEach((targetCanvas) => targetCanvas.classList.remove("dragging"));
  });

  window.addEventListener("touchmove", (event) => {
    if (!state.dragging) {
      return;
    }
    const pos = pointerPosition(event);
    state.rotationY += (pos.x - state.lastX) * 0.01;
    state.rotationX += (pos.y - state.lastY) * 0.01;
    state.lastX = pos.x;
    state.lastY = pos.y;
  }, { passive: true });

  window.addEventListener("mousemove", (event) => {
    if (!compareState.dragging) {
      return;
    }
    const pos = pointerPosition(event);
    compareState.rotationY += (pos.x - compareState.lastX) * 0.01;
    compareState.rotationX += (pos.y - compareState.lastY) * 0.01;
    compareState.lastX = pos.x;
    compareState.lastY = pos.y;
  });

  Object.values(compareCanvases).forEach((targetCanvas) => {
    targetCanvas.addEventListener("touchstart", (event) => {
      if (!compareState.open) {
        return;
      }
      compareState.dragging = true;
      compareState.activeCanvas = targetCanvas;
      targetCanvas.classList.add("dragging");
      const pos = pointerPosition(event);
      compareState.lastX = pos.x;
      compareState.lastY = pos.y;
    }, { passive: true });
  });

  window.addEventListener("touchmove", (event) => {
    if (!compareState.dragging) {
      return;
    }
    const pos = pointerPosition(event);
    compareState.rotationY += (pos.x - compareState.lastX) * 0.01;
    compareState.rotationX += (pos.y - compareState.lastY) * 0.01;
    compareState.lastX = pos.x;
    compareState.lastY = pos.y;
  }, { passive: true });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.zoom *= event.deltaY < 0 ? 1.08 : 0.92;
    state.zoom = Math.min(2.8, Math.max(0.45, state.zoom));
  }, { passive: false });

  window.addEventListener("resize", () => {
    resizeCanvas();
    render();
    if (compareState.open) {
      Object.entries(compareCanvases).forEach(([key, targetCanvas]) => {
        resizeSingleCanvas(targetCanvas, compareContexts[key]);
      });
      renderCompare();
    }
  });

  compareModal.addEventListener("click", (event) => {
    if (event.target === compareModal) {
      closeCompareModal();
    }
  });

  setActiveStructure(state.structureKey);
  resizeCanvas();
  tick();
})();
