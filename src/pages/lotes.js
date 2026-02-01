// src/pages/lotes.js
import { getAuthHeaders, logout } from "../auth/auth";
import { renderTopbar, wireTopbar } from "../ui/header";

export function renderLotesPage({ BACKEND_URL, campoId, onLogout, onGoCampos, onGoCultivos }) {
  const app = document.querySelector("#app");
  const campoIdNum = Number(campoId);

  /* =========================
     Render base (SIEMPRE)
     ========================= */
  app.innerHTML = `
    <main class="shell">
      ${renderTopbar({ active: "campos" })}

      <section class="content">
        <div class="lotes-layout">

          <section class="card card-wide lotes-card">
            <article class="campo-resumen">
              <div class="campo-resumen-top">

                <div class="campo-resumen-left">
                  <button id="btn-volver" class="btn btn-ghost campo-btn-volver" type="button">← Volver</button>
                  <h2 id="campoNombre" class="campo-resumen-title">Campo</h2>
                </div>

                <div class="item-actions-inline">
                  <button class="icon-action" type="button" title="Editar campo">✏️</button>
                  <button class="icon-action danger" type="button" title="Eliminar campo">🗑️</button>
                </div>
              </div>

              <hr class="campo-divider" />

              <div class="campo-resumen-body">
                <div class="campo-resumen-line">
                  <span class="muted">Superficie:</span>
                  <strong id="campoSuperficie">-</strong>
                </div>
                <div class="campo-resumen-line">
                  <span class="muted">Obs:</span>
                  <span id="campoObs">-</span>
                </div>
              </div>
            </article>
          </section>

          <section class="card card-wide lotes-card">
            <header class="lotes-header">
              <div class="lotes-title">
                <h2 class="lotes-h2">Lotes</h2>
                <span id="lotesCount" class="muted"></span>
              </div>

              <button id="btn-nuevo-lote" class="btn lotes-btn-nuevo" type="button">
                + Nuevo lote
              </button>
            </header>

            <div id="lotes-msg" class="msg"></div>
            <div id="lotes-list" class="list"></div>
          </section>

        </div>
      </section>

      <!-- Modal Nuevo lote -->
      <div id="modal-backdrop" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal" tabindex="-1">
          <div class="modal-header">
            <h3 id="modal-title" class="modal-title">Nuevo lote</h3>
            <button id="modal-close" class="icon-btn" type="button" aria-label="Cerrar">✕</button>
          </div>

          <div class="modal-body">
            <form id="form-lote" class="form">
              <div class="field field-row">
                <label class="field-label" for="lote-nombre">Nombre del lote</label>
                <input id="lote-nombre" name="nombre" type="text" required />
              </div>

              <div class="field field-row">
                <label class="field-label" for="lote-superficie">Superficie (ha)</label>
                <input id="lote-superficie" name="superficie" type="number" step="0.01" min="0" required />
              </div>

              <div class="field field-row">
                <label class="field-label" for="lote-obs">Observaciones</label>
                <textarea id="lote-obs" name="observaciones" rows="1"></textarea>
              </div>

              <!-- Desplegable: Datos de cultivo -->
              <button id="cultivo-toggle" class="collapse-toggle" type="button" aria-expanded="false">
                <span class="chev"></span>
                <span>Datos de cultivo</span>
              </button>

              <div id="cultivo-panel" class="collapse-panel hidden">

                <div class="field field-row">
                  <label class="field-label" for="cultivo-id">Cultivo</label>
                  <select id="cultivo-id" name="cultivo_id">
                    <option value="">Seleccionar cultivo...</option>
                  </select>
                </div>

                <div class="field field-row">
                  <label class="field-label" for="ha-cultivo">Superficie cultivada (ha)</label>
                  <div class="cultivo-add-row">
                    <input id="ha-cultivo" name="ha_cultivo" type="number" step="0.01" min="0"/>
                    <button id="btn-add-cultivo" class="btn btn-ghost btn-add-cultivo" type="button">+ Agregar</button>
                  </div>
                </div>

                <div class="cultivos-table-wrap">
                  <div class="cultivos-table-title muted">Cultivos agregados</div>

                  <div id="cultivos-empty" class="empty small">Todavía no agregaste cultivos.</div>

                  <div id="cultivos-list" class="list compact"></div>
                </div>

                <p class="help muted">
                  Podés agregar varios cultivos. La suma de superficies cultivadas no debería superar la superficie del lote.
                </p>
              </div>

              <div class="modal-footer">
                <button id="btn-cancelar" class="btn btn-ghost" type="button">Cancelar</button>
                <button id="btn-guardar" class="btn" type="submit">Guardar</button>
              </div>
            </form>

            <div id="modal-msg" class="msg" aria-live="polite"></div>
          </div>
        </div>
      </div>

    </main>
  `;

  /* =========================
     Helpers
     ========================= */
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatHa(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return Number.isInteger(n) ? `${n} ha` : `${n.toFixed(2)} ha`;
  }

  /* =========================
     Referencias DOM
     ========================= */
  const btnVolver = app.querySelector("#btn-volver");
  const btnNuevoLote = app.querySelector("#btn-nuevo-lote");

  const lotesMsg = app.querySelector("#lotes-msg");
  const lotesList = app.querySelector("#lotes-list");
  const lotesCount = app.querySelector("#lotesCount");

  const campoNombre = app.querySelector("#campoNombre");
  const campoSuperficie = app.querySelector("#campoSuperficie");
  const campoObs = app.querySelector("#campoObs");

  function setMsg(text, type = "info") {
    lotesMsg.textContent = text || "";
    lotesMsg.className = `msg ${type}`;
  }

  function renderCampo(campo) {
    campoNombre.textContent = campo.nombre;
    campoSuperficie.textContent = formatHa(campo.superficie);
    campoObs.textContent = campo.observaciones || "-";
  }

  btnVolver.addEventListener("click", () => onGoCampos?.());

  /* =========================
     Modal Nuevo lote
     ========================= */
  const modalBackdrop = app.querySelector("#modal-backdrop");
  const modalClose = app.querySelector("#modal-close");
  const formLote = app.querySelector("#form-lote");
  const modalMsg = app.querySelector("#modal-msg");
  const btnCancelar = app.querySelector("#btn-cancelar");

  const cultivoToggle = app.querySelector("#cultivo-toggle");
  const cultivoPanel = app.querySelector("#cultivo-panel");
  const cultivoIdSelect = app.querySelector("#cultivo-id");
  const haCultivoInput = app.querySelector("#ha-cultivo");

  const btnAddCultivo = app.querySelector("#btn-add-cultivo");
  const cultivosListEl = app.querySelector("#cultivos-list");
  const cultivosEmptyEl = app.querySelector("#cultivos-empty");

  let cultivosAdded = []; // [{ cultivo_id, nombre, ha_cultivo }]

  function setModalMsg(text, type = "info") {
    modalMsg.textContent = text || "";
    modalMsg.className = `msg ${type}`;
  }

  function renderCultivosAdded() {
    if (!cultivosAdded.length) {
      cultivosEmptyEl.classList.remove("hidden");
      cultivosListEl.innerHTML = "";
      return;
    }

    cultivosEmptyEl.classList.add("hidden");

    cultivosListEl.innerHTML = cultivosAdded
      .map(
        (c, idx) => `
        <article class="item cultivo-item" data-idx="${idx}">
          <div class="item-row">
            <div class="item-main">
              <div class="item-title">
                <strong>${escapeHtml(c.nombre)}</strong>
                <span class="pill">${Number(c.ha_cultivo).toFixed(2)} ha</span>
              </div>
            </div>

            <div class="item-actions-inline">
              <button class="icon-action danger js-del-cultivo" type="button" title="Quitar" aria-label="Quitar">🗑️</button>
            </div>
          </div>
        </article>
      `
      )
      .join("");
  }

  // Quitar cultivo agregado
  cultivosListEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-del-cultivo");
    if (!btn) return;

    const item = e.target.closest(".cultivo-item");
    if (!item) return;

    const idx = Number(item.getAttribute("data-idx"));
    if (!Number.isFinite(idx)) return;

    cultivosAdded.splice(idx, 1);
    renderCultivosAdded();
  });

  // Agregar cultivo (con fallback robusto)
  btnAddCultivo.addEventListener("click", () => {
    setModalMsg("");

    const cultivoId = cultivoIdSelect.value ? Number(cultivoIdSelect.value) : null;
    const haCultivo = haCultivoInput.value !== "" ? Number(haCultivoInput.value) : null;

    if (!cultivoId) {
      setModalMsg("Seleccioná un cultivo.", "error");
      return;
    }
    if (!Number.isFinite(haCultivo) || haCultivo <= 0) {
      setModalMsg("La superficie cultivada debe ser mayor a 0.", "error");
      return;
    }

    const cultivoNombre =
      cultivoIdSelect.options[cultivoIdSelect.selectedIndex]?.textContent?.trim() || "Cultivo";

    // Si ya existe ese cultivo, acumulamos ha
    const existing = cultivosAdded.find((x) => x.cultivo_id === cultivoId);
    if (existing) {
      existing.ha_cultivo = haCultivo;
    }
    else {
      cultivosAdded.push({
        cultivo_id: cultivoId,
        nombre: cultivoNombre,
        ha_cultivo: haCultivo,
      });
    }

    cultivoIdSelect.value = "";
    haCultivoInput.value = "";
    renderCultivosAdded();
  });

  function openModal() {
    setModalMsg("");
    modalBackdrop.classList.remove("hidden");
    document.body.classList.add("no-scroll");

    // reset form
    formLote.reset();

    // reset panel cultivo
    cultivoPanel.classList.add("hidden");
    cultivoToggle.setAttribute("aria-expanded", "false");
    cultivoToggle.querySelector(".chev").textContent = "›";

    // reset cultivos agregados
    cultivosAdded = [];
    renderCultivosAdded();

    // cargar cultivos en combo
    loadCultivosForSelect();
  }

  function closeModal() {
    modalBackdrop.classList.add("hidden");
    document.body.classList.remove("no-scroll");
  }

  modalClose.addEventListener("click", closeModal);
  btnCancelar.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Botón “+ Nuevo lote”
  btnNuevoLote.addEventListener("click", openModal);

  // Toggle desplegable cultivo
  cultivoToggle.addEventListener("click", () => {
    const expanded = cultivoToggle.getAttribute("aria-expanded") === "true";

    cultivoToggle.setAttribute("aria-expanded", String(!expanded));
    cultivoPanel.classList.toggle("hidden"); // ✅ abre/cierra

    cultivoToggle.querySelector(".chev").textContent = expanded ? "›" : "⌄";
  });

  async function loadCultivosForSelect() {
    try {
      const resp = await fetch(`${BACKEND_URL}/cultivos`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        logout();
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setModalMsg(data.error || "No se pudieron cargar los cultivos.", "error");
        return;
      }

      const items = data?.data ?? data;
      const list = Array.isArray(items) ? items : [];

      cultivoIdSelect.innerHTML = `
        <option value="">Seleccionar cultivo...</option>
        ${list.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("")}
      `;
    } catch (e) {
      console.error(e);
      setModalMsg("Error de conexión al cargar cultivos.", "error");
    }
  }

  // Submit: crear lote + lista de cultivos
  formLote.addEventListener("submit", async (e) => {
    e.preventDefault();
    setModalMsg("");

    const nombre = app.querySelector("#lote-nombre").value.trim();
    const superficie = Number(app.querySelector("#lote-superficie").value);
    const observaciones = app.querySelector("#lote-obs").value.trim();

    if (!nombre) return setModalMsg("El nombre es obligatorio.", "error");
    if (!Number.isFinite(superficie) || superficie <= 0) return setModalMsg("La superficie debe ser mayor a 0.", "error");

    // Validación: si hay cultivos agregados, controlar suma <= superficie del lote
    const sumHaCultivo = cultivosAdded.reduce((acc, c) => acc + Number(c.ha_cultivo || 0), 0);
    if (cultivosAdded.length && sumHaCultivo > superficie) {
      return setModalMsg("La suma de superficies cultivadas supera la superficie del lote.", "error");
    }

    const payload = {
      campo_id: campoIdNum,
      nombre,
      superficie,
      observaciones: observaciones || null,
    };

    // Enviar cultivos solo si hay
    if (cultivosAdded.length) {
      payload.cultivos = cultivosAdded.map((c) => ({
        cultivo_id: c.cultivo_id,
        ha_cultivo: c.ha_cultivo,
      }));
    }

    try {
      const resp = await fetch(`${BACKEND_URL}/lotes`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        logout();
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setModalMsg(data.error || "No se pudo crear el lote.", "error");
        return;
      }

      closeModal();
      await loadLotes();
    } catch (err) {
      console.error(err);
      setModalMsg("Error de conexión al guardar el lote.", "error");
    }
  });

  /* =========================
     Validación campoId
     ========================= */
  if (!Number.isFinite(campoIdNum)) {
    setMsg("campoId inválido. No se puede cargar el campo.", "error");
    campoNombre.textContent = "Campo inválido";
    return;
  }

  /* =========================
     API
     ========================= */
  async function loadCampo() {
    const resp = await fetch(`${BACKEND_URL}/campos/${campoIdNum}`, {
      headers: getAuthHeaders(),
    });
    const data = await resp.json();
    return data?.data ?? data;
  }

  async function loadLotes() {
    const resp = await fetch(`${BACKEND_URL}/lotes?campo_id=${campoIdNum}`, {
      headers: getAuthHeaders(),
    });
    const data = await resp.json();

    const list = Array.isArray(data) ? data : [];
    lotesCount.textContent = `${list.length} ${list.length === 1 ? "lote" : "lotes"}`;

    lotesList.innerHTML = list.length
      ? list.map((l) => `<div class="item">${escapeHtml(l.nombre)}</div>`).join("")
      : `<div class="empty">Todavía no hay lotes cargados.</div>`;
  }

  /* =========================
     Topbar
     ========================= */
  wireTopbar({
    onGoCampos,
    onGoCultivos,
    onRefresh: loadLotes,
    onLogout: () => {
      logout();
      onLogout?.();
    },
  });

  /* =========================
     Init
     ========================= */
  (async () => {
    try {
      const campo = await loadCampo();
      renderCampo(campo);
      await loadLotes();
    } catch (e) {
      console.error(e);
      setMsg("Error al cargar datos.", "error");
    }
  })();
}
