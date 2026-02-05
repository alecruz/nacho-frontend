// src/pages/lotes.js
import { getAuthHeaders, logout } from "../auth/auth";
import { renderTopbar, wireTopbar } from "../ui/header";

export function renderLotesPage({ BACKEND_URL, campoId, onLogout, onGoCampos, onGoCultivos, onGoInsumos}) {
  const app = document.querySelector("#app");
  const campoIdNum = Number(campoId);

  // ✅ Cache para validaciones (superficie campo + lotes existentes)
  let campoData = null; // objeto campo (incluye superficie)
  let lotesCache = []; // lista de lotes del campo

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
                  <h2 id="campoNombre" class="campo-resumen-title">Campo</h2>
                </div>
              </div>

              <hr class="campo-divider" />

              <div class="campo-resumen-body campo-resumen-body-row">
                <div class="campo-resumen-data">
                  <div class="campo-resumen-line">
                    <span class="muted">Superficie:</span>
                    <strong id="campoSuperficie">-</strong>
                  </div>

                  <div class="campo-resumen-line">
                    <span class="muted">Obs:</span>
                    <span id="campoObs">-</span>
                  </div>
                </div>

                <!-- ✅ Solo editar -->
                <div class="item-actions-inline campo-actions-right">
                  <button
                    id="btn-edit-campo"
                    class="icon-action"
                    type="button"
                    title="Editar campo"
                    aria-label="Editar campo"
                  >✏️</button>
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

      <!-- Modal Nuevo/Editar lote -->
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

      <!-- ✅ Modal: Confirmar eliminación (lote) -->
      <div id="modal-delete" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
        <div class="modal" tabindex="-1">
          <header class="modal-header">
            <h3 id="modal-delete-title" class="modal-title">Eliminar lote</h3>
            <button type="button" class="icon-btn" data-close="modal-delete" aria-label="Cerrar">✕</button>
          </header>

          <div class="modal-body">
            <p class="modal-text">
              ¿Seguro que querés eliminar <strong id="delete-name"></strong>?
              <br />
              Quedará inactivo y no se borrará información histórica.
            </p>

            <div id="delete-msg" class="msg" aria-live="polite"></div>

            <footer class="modal-footer">
              <button type="button" class="btn btn-ghost" data-close="modal-delete">Cancelar</button>
              <button id="delete-confirm" type="button" class="btn btn-danger">Eliminar</button>
            </footer>
          </div>
        </div>
      </div>

      <!-- ✅ Modal: Editar campo (reutiliza el de campos.js) -->
      <div id="modal-edit" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
        <div class="modal">
          <header class="modal-header">
            <h3 id="modal-edit-title" class="modal-title">Editar campo</h3>
            <button type="button" class="icon-btn" data-close="modal-edit" aria-label="Cerrar">✕</button>
          </header>

          <form id="edit-form" class="modal-body form">
            <input type="hidden" id="edit-id" />

            <label class="field">
              <span>Nombre</span>
              <input id="edit-nombre" type="text" required />
            </label>

            <label class="field">
              <span>Superficie (ha)</span>
              <input id="edit-superficie" type="number" step="0.01" min="0" required />
            </label>

            <label class="field">
              <span>Observaciones</span>
              <textarea id="edit-obs" rows="3"></textarea>
            </label>

            <div id="edit-msg" class="msg" aria-live="polite"></div>

            <footer class="modal-footer">
              <button type="button" class="btn btn-ghost" data-close="modal-edit">Cancelar</button>
              <button id="edit-save" type="submit" class="btn">Guardar cambios</button>
            </footer>
          </form>
        </div>
      </div>

      <!-- Toast -->
      <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>

    </main>
  `;

  /* =========================
     Helpers
     ========================= */
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatHa(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return `${n.toFixed(2)} ha`;
  }

  function sumSuperficieLotes(list) {
    return (Array.isArray(list) ? list : []).reduce((acc, l) => {
      const sup = Number(l?.superficie);
      if (!Number.isFinite(sup) || sup <= 0) return acc;
      return acc + sup;
    }, 0);
  }

  const toastEl = app.querySelector("#toast");
  let toastTimer = null;

  function showToast(message, type = "success", ms = 2200) {
    if (!toastEl) return;

    toastEl.textContent = message || "";
    toastEl.className = `toast ${type}`;
    toastEl.classList.remove("hidden");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, ms);
  }

  /* =========================
     Referencias DOM
     ========================= */
  const btnNuevoLote = app.querySelector("#btn-nuevo-lote");

  const lotesMsg = app.querySelector("#lotes-msg");
  const lotesList = app.querySelector("#lotes-list");
  const lotesCount = app.querySelector("#lotesCount");

  const campoNombre = app.querySelector("#campoNombre");
  const campoSuperficie = app.querySelector("#campoSuperficie");
  const campoObs = app.querySelector("#campoObs");

  const btnEditCampo = app.querySelector("#btn-edit-campo");

  function setMsg(text, type = "info") {
    lotesMsg.textContent = text || "";
    lotesMsg.className = `msg ${type}`;
  }

  function renderCampo(campo) {
    campoNombre.textContent = campo?.nombre ?? "Campo";
    campoSuperficie.textContent = formatHa(campo?.superficie);
    campoObs.textContent = campo?.observaciones || "-";
  }

  /* =========================
     Modales (helpers generales)
     ========================= */
  function openModal(modalEl) {
    modalEl.classList.remove("hidden");
    document.body.classList.add("no-scroll");
    setTimeout(() => modalEl.querySelector(".modal")?.focus?.(), 0);
  }

  function closeModal(modalEl) {
    modalEl.classList.add("hidden");
    document.body.classList.remove("no-scroll");
  }

  /* =========================
     ✅ Modal eliminar lote
     ========================= */
  const modalDelete = app.querySelector("#modal-delete");
  const deleteName = app.querySelector("#delete-name");
  const deleteMsg = app.querySelector("#delete-msg");
  const deleteConfirmBtn = app.querySelector("#delete-confirm");

  function setDeleteMsg(text, type = "info") {
    deleteMsg.textContent = text || "";
    deleteMsg.className = `msg ${type}`;
  }

  modalDelete.addEventListener("click", (e) => {
    const target = e.target;
    const closeId = target?.getAttribute?.("data-close");
    if (closeId) closeModal(document.querySelector(`#${closeId}`));
    if (target.classList.contains("modal-backdrop")) closeModal(modalDelete);
  });

  /* =========================
     ✅ Modal editar campo (reutilizado)
     ========================= */
  const modalEditCampo = app.querySelector("#modal-edit");
  const editForm = app.querySelector("#edit-form");
  const editMsg = app.querySelector("#edit-msg");
  const editSaveBtn = app.querySelector("#edit-save");

  function setEditMsg(text, type = "info") {
    editMsg.textContent = text || "";
    editMsg.className = `msg ${type}`;
  }

  // Cerrar modal editar campo: backdrop o data-close
  modalEditCampo.addEventListener("click", (e) => {
    const target = e.target;
    const closeId = target?.getAttribute?.("data-close");
    if (closeId) closeModal(document.querySelector(`#${closeId}`));
    if (target.classList.contains("modal-backdrop")) closeModal(modalEditCampo);
  });

  // ESC cierra ambos
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(modalDelete);
      closeModal(modalEditCampo);
    }
  });

  // Abrir modal editar campo desde el botón
  btnEditCampo.addEventListener("click", () => {
    if (!campoData) {
      setMsg("No se pudo cargar el campo para editar.", "error");
      return;
    }

    app.querySelector("#edit-id").value = String(campoIdNum);
    app.querySelector("#edit-nombre").value = campoData?.nombre ?? "";
    app.querySelector("#edit-superficie").value = campoData?.superficie ?? "";
    app.querySelector("#edit-obs").value = campoData?.observaciones ?? "";

    setEditMsg("");
    openModal(modalEditCampo);
  });

  // Submit editar campo + ✅ validación: no reducir por debajo de suma lotes
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setEditMsg("");

    const id = app.querySelector("#edit-id").value;
    const nombre = app.querySelector("#edit-nombre").value.trim();
    const superficieRaw = app.querySelector("#edit-superficie").value;
    const observaciones = app.querySelector("#edit-obs").value.trim();

    if (!nombre) return setEditMsg("El nombre es obligatorio.", "error");
    if (!superficieRaw) return setEditMsg("La superficie es obligatoria.", "error");

    const nuevaSup = Number(superficieRaw);
    if (!Number.isFinite(nuevaSup) || nuevaSup <= 0) {
      return setEditMsg("La superficie debe ser un número mayor a 0.", "error");
    }

    const sumaLotes = sumSuperficieLotes(lotesCache);
    if (nuevaSup < sumaLotes) {
      return setEditMsg(
        `No podés reducir la superficie del campo a ${nuevaSup.toFixed(
          2
        )} ha porque la suma de lotes es ${sumaLotes.toFixed(2)} ha.`,
        "error"
      );
    }

    editSaveBtn.disabled = true;
    const original = editSaveBtn.textContent;
    editSaveBtn.textContent = "Guardando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/campos/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" }, // ✅ fix
        body: JSON.stringify({
          nombre,
          superficie: nuevaSup,
          observaciones: observaciones || null,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        logout();
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setEditMsg(data?.message || data?.error || "No se pudo guardar.", "error"); // ✅ fix
        return;
      }

      // ✅ refresco cache + UI
      campoData = data?.data ?? data;
      renderCampo(campoData);

      closeModal(modalEditCampo);
      showToast("Campo actualizado", "success", 2200);
    } catch (err) {
      console.error(err);
      setEditMsg("Error de conexión.", "error");
    } finally {
      editSaveBtn.disabled = false;
      editSaveBtn.textContent = original;
    }
  });

  /* =========================
     Render cards (lotes)
     ========================= */
  function renderLotesCards(list) {
    if (!Array.isArray(list) || list.length === 0) {
      lotesCount.textContent = `0 lotes`;
      lotesList.innerHTML = `<div class="empty">Todavía no hay lotes cargados.</div>`;
      return;
    }

    lotesCount.textContent = `${list.length} ${list.length === 1 ? "lote" : "lotes"}`;

    lotesList.innerHTML = `
      <div class="lotes-grid">
        ${list
          .map((l) => {
            const sup = formatHa(l.superficie);
            const obs = l.observaciones ? escapeHtml(l.observaciones) : "Sin observaciones";
            const cultivos = Array.isArray(l.cultivos) ? l.cultivos : [];

            const cultivosHtml = cultivos.length
              ? `
                <div class="lote-card-cultivos">
                  ${cultivos
                    .map((c, i) => {
                      const nombre = escapeHtml(c?.nombre ?? "Cultivo");
                      const ha = c?.ha_cultivo != null ? Number(c.ha_cultivo) : null;
                      const haTxt = ha != null && Number.isFinite(ha) ? ` (${ha.toFixed(2)} ha)` : "";

                      return `
                        <div class="lote-card-cultivo-line">
                          <span class="cultivo-label">${i === 0 ? "Cultivo:" : ""}</span>
                          <span class="cultivo-nombre">${nombre}${haTxt}</span>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              `
              : `
                <div class="lote-card-cultivos">
                  <div class="lote-card-cultivo-line">
                    <span class="cultivo-label">Cultivo:</span>
                    <span class="cultivo-nombre">Sin cultivo</span>
                  </div>
                </div>
              `;

            return `
              <article class="lote-card" data-id="${l.id}" data-nombre="${escapeHtml(l.nombre)}">
                <div class="lote-card-top">
                  <h3 class="lote-card-title">${escapeHtml(l.nombre)}</h3>

                  <div class="lote-card-actions">
                    <button class="icon-action js-edit-lote" type="button" title="Editar lote" aria-label="Editar">✏️</button>
                    <button class="icon-action danger js-del-lote" type="button" title="Eliminar lote" aria-label="Eliminar">🗑️</button>
                  </div>
                </div>

                <div class="lote-card-body">
                  <div class="lote-card-line"><strong>Superficie:</strong> ${sup}</div>
                  <div class="lote-card-obs">${obs}</div>
                </div>

                <div class="lote-card-divider"></div>

                <div class="lote-card-footer">
                  ${cultivosHtml}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  /* =========================
     Eliminar lote (borrado lógico) - modal
     ========================= */
  function openDeleteModal({ loteId, loteNombre }) {
    deleteConfirmBtn.setAttribute("data-id", String(loteId));
    deleteName.textContent = loteNombre || "este lote";
    setDeleteMsg("", "info");
    openModal(modalDelete);
  }

  async function confirmDeleteLote(loteId) {
    if (!Number.isFinite(Number(loteId))) return;

    deleteConfirmBtn.disabled = true;
    const original = deleteConfirmBtn.textContent;
    deleteConfirmBtn.textContent = "Eliminando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/lotes/${loteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        logout();
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setDeleteMsg(data?.message || data?.error || "No se pudo eliminar el lote.", "error"); // ✅ fix
        return;
      }

      closeModal(modalDelete);
      setMsg("Lote eliminado ✅", "success");
      await loadLotes();
    } catch (e) {
      console.error(e);
      setDeleteMsg("Error de conexión al eliminar el lote.", "error");
    } finally {
      deleteConfirmBtn.disabled = false;
      deleteConfirmBtn.textContent = original;
    }
  }

  deleteConfirmBtn.addEventListener("click", async () => {
    const id = Number(deleteConfirmBtn.getAttribute("data-id"));
    if (!Number.isFinite(id)) return;
    await confirmDeleteLote(id);
  });

  // Delegación (editar/eliminar) en cards
  lotesList.addEventListener("click", (e) => {
    const card = e.target.closest(".lote-card");
    if (!card) return;

    const loteId = Number(card.getAttribute("data-id"));
    if (!Number.isFinite(loteId)) return;

    if (e.target.closest(".js-edit-lote")) {
      openEditModal(loteId);
      return;
    }

    if (e.target.closest(".js-del-lote")) {
      const nombre = card.getAttribute("data-nombre") || "este lote";
      openDeleteModal({ loteId, loteNombre: nombre });
      return;
    }
  });

  /* =========================
     Modal Nuevo/Editar lote
     ========================= */
  const modalBackdrop = app.querySelector("#modal-backdrop");
  const modalClose = app.querySelector("#modal-close");
  const formLote = app.querySelector("#form-lote");
  const modalMsg = app.querySelector("#modal-msg");
  const btnCancelar = app.querySelector("#btn-cancelar");
  const modalTitle = app.querySelector("#modal-title");

  const cultivoToggle = app.querySelector("#cultivo-toggle");
  const cultivoPanel = app.querySelector("#cultivo-panel");
  const cultivoIdSelect = app.querySelector("#cultivo-id");
  const haCultivoInput = app.querySelector("#ha-cultivo");

  const btnAddCultivo = app.querySelector("#btn-add-cultivo");
  const cultivosListEl = app.querySelector("#cultivos-list");
  const cultivosEmptyEl = app.querySelector("#cultivos-empty");

  let editingLoteId = null; // null = nuevo | number = editar
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

  // Agregar cultivo (sobrescribe ha si ya existe)
  btnAddCultivo.addEventListener("click", () => {
    setModalMsg("");

    const cultivoId = cultivoIdSelect.value ? Number(cultivoIdSelect.value) : null;
    const haCultivo = haCultivoInput.value !== "" ? Number(haCultivoInput.value) : null;

    if (!cultivoId) return setModalMsg("Seleccioná un cultivo.", "error");
    if (!Number.isFinite(haCultivo) || haCultivo <= 0) {
      return setModalMsg("La superficie cultivada debe ser mayor a 0.", "error");
    }

    const cultivoNombre =
      cultivoIdSelect.options[cultivoIdSelect.selectedIndex]?.textContent?.trim() || "Cultivo";

    const existing = cultivosAdded.find((x) => x.cultivo_id === cultivoId);
    if (existing) {
      existing.ha_cultivo = haCultivo; // ✅ sobre-escribe (NO suma)
    } else {
      cultivosAdded.push({ cultivo_id: cultivoId, nombre: cultivoNombre, ha_cultivo: haCultivo });
    }

    cultivoIdSelect.value = "";
    haCultivoInput.value = "";
    renderCultivosAdded();
  });

  function openNewModal() {
    editingLoteId = null;
    modalTitle.textContent = "Nuevo lote";
    setModalMsg("");

    modalBackdrop.classList.remove("hidden");
    document.body.classList.add("no-scroll");

    formLote.reset();

    cultivoPanel.classList.add("hidden");
    cultivoToggle.setAttribute("aria-expanded", "false");

    cultivosAdded = [];
    renderCultivosAdded();

    loadCultivosForSelect();
  }

  async function openEditModal(loteId) {
    editingLoteId = loteId;
    modalTitle.textContent = "Editar lote";
    setModalMsg("");

    modalBackdrop.classList.remove("hidden");
    document.body.classList.add("no-scroll");

    formLote.reset();
    cultivosAdded = [];
    renderCultivosAdded();

    await loadCultivosForSelect();

    try {
      const resp = await fetch(`${BACKEND_URL}/lotes/${loteId}`, {
        headers: getAuthHeaders(),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        logout();
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setModalMsg(data?.message || data?.error || "No se pudo cargar el lote.", "error"); // ✅ fix
        return;
      }

      const lote = data?.data ?? data;

      app.querySelector("#lote-nombre").value = lote?.nombre ?? "";
      app.querySelector("#lote-superficie").value = lote?.superficie ?? "";
      app.querySelector("#lote-obs").value = lote?.observaciones ?? "";

      const cultivos = Array.isArray(lote?.cultivos) ? lote.cultivos : [];
      cultivosAdded = cultivos.map((c) => ({
        cultivo_id: Number(c.cultivo_id),
        nombre: c.nombre ?? "Cultivo",
        ha_cultivo: Number(c.ha_cultivo),
      }));

      renderCultivosAdded();

      if (cultivosAdded.length) {
        cultivoPanel.classList.remove("hidden");
        cultivoToggle.setAttribute("aria-expanded", "true");
      } else {
        cultivoPanel.classList.add("hidden");
        cultivoToggle.setAttribute("aria-expanded", "false");
      }
    } catch (e) {
      console.error(e);
      setModalMsg("Error de conexión al cargar el lote.", "error");
    }
  }

  function closeModalEdit() {
    modalBackdrop.classList.add("hidden");
    document.body.classList.remove("no-scroll");

    editingLoteId = null;
    modalTitle.textContent = "Nuevo lote";
    setModalMsg("");
  }

  modalClose.addEventListener("click", closeModalEdit);
  btnCancelar.addEventListener("click", closeModalEdit);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModalEdit();
  });

  btnNuevoLote.addEventListener("click", openNewModal);

  cultivoToggle.addEventListener("click", () => {
    const expanded = cultivoToggle.getAttribute("aria-expanded") === "true";
    cultivoToggle.setAttribute("aria-expanded", String(!expanded));
    cultivoPanel.classList.toggle("hidden");
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
        setModalMsg(data?.message || data?.error || "No se pudieron cargar los cultivos.", "error"); // ✅ fix
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

  // Submit: crear o editar lote + lista de cultivos
  formLote.addEventListener("submit", async (e) => {
    e.preventDefault();
    setModalMsg("");

    const nombre = app.querySelector("#lote-nombre").value.trim();
    const superficie = Number(app.querySelector("#lote-superficie").value);
    const observaciones = app.querySelector("#lote-obs").value.trim();

    if (!nombre) return setModalMsg("El nombre es obligatorio.", "error");
    if (!Number.isFinite(superficie) || superficie <= 0) {
      return setModalMsg("La superficie debe ser mayor a 0.", "error");
    }

    // ✅ Validación: lotes del campo NO pueden superar la superficie del campo
    const supCampo = Number(campoData?.superficie);
    if (!Number.isFinite(supCampo) || supCampo <= 0) {
      return setModalMsg("No se pudo validar: la superficie del campo no está disponible.", "error");
    }

    const sumLotesExistentes = (Array.isArray(lotesCache) ? lotesCache : []).reduce((acc, l) => {
      const id = Number(l?.id);
      const sup = Number(l?.superficie);
      if (!Number.isFinite(sup) || sup <= 0) return acc;

      // Si edito, excluyo el lote actual
      if (editingLoteId && id === Number(editingLoteId)) return acc;

      return acc + sup;
    }, 0);

    const totalConEsteLote = sumLotesExistentes + superficie;
    if (totalConEsteLote > supCampo) {
      const disponible = supCampo - sumLotesExistentes;
      return setModalMsg(
        `No podés guardar el lote: la suma de superficies de los lotes (${totalConEsteLote.toFixed(
          2
        )} ha) supera la superficie del campo (${supCampo.toFixed(
          2
        )} ha). Disponible: ${disponible.toFixed(2)} ha.`,
        "error"
      );
    }

    // Validación existente: cultivos dentro del lote
    const sumHaCultivo = cultivosAdded.reduce((acc, c) => acc + Number(c.ha_cultivo || 0), 0);
    if (cultivosAdded.length && sumHaCultivo > superficie) {
      return setModalMsg("La suma de superficies cultivadas supera la superficie del lote.", "error");
    }

    const payload = {
      nombre,
      superficie,
      observaciones: observaciones || null,
    };

    if (!editingLoteId) payload.campo_id = campoIdNum;

    payload.cultivos = cultivosAdded.length
      ? cultivosAdded.map((c) => ({ cultivo_id: c.cultivo_id, ha_cultivo: c.ha_cultivo }))
      : [];

    const url = editingLoteId ? `${BACKEND_URL}/lotes/${editingLoteId}` : `${BACKEND_URL}/lotes`;
    const method = editingLoteId ? "PUT" : "POST";

    try {
      const resp = await fetch(url, {
        method,
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
        if (resp.status === 409 && data?.code === "LOTE_DUPLICADO") {
          setModalMsg(
            data?.message || "Ya existe un lote activo con ese nombre en este campo.",
            "error"
          );
          return;
        }

        setModalMsg(data?.message || data?.error || "No se pudo guardar el lote.", "error");
        return;
      }

      closeModalEdit();
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

    const data = await resp.json().catch(() => ({}));

    if (resp.status === 401) {
      logout();
      onLogout?.();
      return null;
    }

    if (!resp.ok) return null;

    const campo = data?.data ?? data;
    campoData = campo; // ✅ cache
    return campo;
  }

  async function loadLotes() {
    try {
      setMsg("", "info");

      const resp = await fetch(`${BACKEND_URL}/lotes?campo_id=${campoIdNum}`, {
        headers: getAuthHeaders(),
      });

      const data = await resp.json().catch(() => ([]));

      if (resp.status === 401) {
        logout();
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setMsg(data?.message || data?.error || "No se pudieron cargar los lotes.", "error"); // ✅ fix
        renderLotesCards([]);
        lotesCache = [];
        return;
      }

      const list = Array.isArray(data) ? data : [];
      lotesCache = list; // ✅ cache
      renderLotesCards(list);
    } catch (e) {
      console.error(e);
      setMsg("Error de conexión al cargar lotes.", "error");
      renderLotesCards([]);
      lotesCache = [];
    }
  }

  /* =========================
     Topbar
     ========================= */
  wireTopbar({
    onGoCampos,
    onGoCultivos,
    onGoInsumos,
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
