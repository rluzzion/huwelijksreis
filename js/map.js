/**
 * Sleep vliegtuig over de wereldkaart; bij loslaten nabij een bestemming → navigatie.
 * Buiten een bestemming blijft het vliegtuig staan waar het losgelaten wordt.
 * Werkt met muis én touch (mobile-first).
 */
(function () {
  const stage = document.getElementById("map-stage");
  const plane = document.getElementById("plane");
  const hotspots = Array.from(document.querySelectorAll(".hotspot[data-href]"));

  if (!stage || !plane || hotspots.length === 0) return;

  const HIT_RATIO = 0.09; // ~9% van de kaartbreedte als sleep-zone
  let dragging = false;
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;

  function stageRect() {
    return stage.getBoundingClientRect();
  }

  function planeSize() {
    return plane.getBoundingClientRect().width || 52;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setPlaneCenter(xPct, yPct) {
    plane.style.left = `${xPct}%`;
    plane.style.top = `${yPct}%`;
  }

  function centerFromEvent(clientX, clientY) {
    const rect = stageRect();
    const size = planeSize();
    const x = clientX - rect.left - offsetX;
    const y = clientY - rect.top - offsetY;
    const half = size / 2;
    const clampedX = clamp(x, half, rect.width - half);
    const clampedY = clamp(y, half, rect.height - half);
    return {
      xPct: (clampedX / rect.width) * 100,
      yPct: (clampedY / rect.height) * 100,
    };
  }

  function nearestHotspot() {
    const rect = stageRect();
    const planeBox = plane.getBoundingClientRect();
    const px = planeBox.left + planeBox.width / 2 - rect.left;
    const py = planeBox.top + planeBox.height / 2 - rect.top;
    const threshold = rect.width * HIT_RATIO;

    let best = null;
    let bestDist = Infinity;

    hotspots.forEach((spot) => {
      const left = parseFloat(spot.style.left) || 0;
      const top = parseFloat(spot.style.top) || 0;
      const sx = (left / 100) * rect.width;
      const sy = (top / 100) * rect.height;
      const dist = Math.hypot(px - sx, py - sy);
      if (dist < threshold && dist < bestDist) {
        bestDist = dist;
        best = spot;
      }
    });

    return best;
  }

  function clearNear() {
    hotspots.forEach((s) => s.classList.remove("is-near"));
  }

  function updateNear() {
    clearNear();
    const near = nearestHotspot();
    if (near) near.classList.add("is-near");
    return near;
  }

  function goTo(spot) {
    const href = spot.getAttribute("data-href");
    if (!href) return;
    stage.classList.add("is-success");
    plane.classList.remove("is-dragging");
    dragging = false;
    setTimeout(() => {
      window.location.href = href;
    }, 280);
  }

  function onPointerDown(event) {
    if (event.button != null && event.button !== 0) return;
    dragging = true;
    pointerId = event.pointerId;
    plane.classList.add("is-dragging");
    plane.setPointerCapture(event.pointerId);

    const rect = plane.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    const { xPct, yPct } = centerFromEvent(event.clientX, event.clientY);
    setPlaneCenter(xPct, yPct);
    updateNear();
  }

  function onPointerUp(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    plane.classList.remove("is-dragging");

    try {
      plane.releasePointerCapture(event.pointerId);
    } catch (_) {
      /* already released */
    }

    const near = updateNear();
    if (near) {
      goTo(near);
    } else {
      clearNear();
    }
  }

  function onPointerCancel(event) {
    if (event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    plane.classList.remove("is-dragging");
    clearNear();
  }

  plane.addEventListener("pointerdown", onPointerDown);
  plane.addEventListener("pointermove", onPointerMove);
  plane.addEventListener("pointerup", onPointerUp);
  plane.addEventListener("pointercancel", onPointerCancel);

  // Klik op hotspot als fallback (toegankelijkheid / geen drag)
  hotspots.forEach((spot) => {
    spot.addEventListener("click", () => goTo(spot));
  });
})();
