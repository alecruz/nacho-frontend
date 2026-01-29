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
    </main>
  `;

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

  btnVolver.addEventListener("click", () => onGoCampos?.());
  btnNuevoLote.addEventListener("click", () => {
    setMsg("Siguiente paso: implementar modal Nuevo lote.", "info");
  });

  function setMsg(text, type = "info") {
    lotesMsg.textContent = text || "";
    lotesMsg.className = `msg ${type}`;
  }

  function formatHa(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return Number.isInteger(n) ? `${n} ha` : `${n.toFixed(2)} ha`;
  }

  function renderCampo(campo) {    
    campoNombre.textContent = campo.nombre;
    campoSuperficie.textContent = formatHa(campo.superficie);
    campoObs.textContent = campo.observaciones || "-";
  }

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
    lotesCount.textContent = `${data.length} lotes`;
    lotesList.innerHTML = data.length
      ? data.map(l => `<div class="item">${l.nombre}</div>`).join("")
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
