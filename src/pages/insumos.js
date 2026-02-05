// src/pages/insumos.js
import { getAuthHeaders, logout } from "../auth/auth";
import { renderTopbar, wireTopbar } from "../ui/header";

const INSUMO_CATEGORIAS = [
  "Fertilizante",
  "Herbicida",
  "Insecticida",
  "Fungicida",
  "Semilla",
  "Combustible",
  "Lubricante",
  "Otro",
];

const INSUMO_UNIDADES = [
  "kg",
  "g",
  "L",
  "mL",  
  "unidad",
];

export function renderInsumosPage({
  BACKEND_URL,
  onLogout,
  onGoCampos,
  onGoCultivos,
  onGoInsumos,
}) {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <main class="shell">
      ${renderTopbar({ active: "insumos" })}

      <section class="content">
        <section class="card card-wide">
          <header class="header">
            <div>
              <h1>Insumos</h1>
              <p>Catálogo de insumos del cliente.</p>
            </div>
          </header>

          <div class="grid">
            <section class="panel">
              <h2 class="h2">Nuevo insumo</h2>

              <form id="insumo-form" class="form">
                <label class="field">
                  <span>Nombre</span>
                  <input id="insumo-nombre" type="text" required />
                </label>

                <label class="field">
                  <span>Categoría</span>
                  <select id="insumo-categoria" class="select">
                    <option value="">Seleccionar categoría...</option>
                    ${INSUMO_CATEGORIAS.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
                  </select>
                </label>

                <label class="field">
                  <span>Unidad</span>
                  <select id="insumo-unidad" class="select">
                    <option value="">Seleccionar unidad...</option>
                    ${INSUMO_UNIDADES.map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("")}
                  </select>
                </label>

                <label class="field">
                  <span>Observaciones</span>
                  <textarea id="insumo-obs" rows="3"></textarea>
                </label>

                <button id="insumo-btn" class="btn" type="submit">Crear insumo</button>
                <div id="insumo-msg" class="msg" aria-live="polite"></div>
              </form>
            </section>

            <section class="panel">
              <h2 class="h2">Tus insumos</h2>
              <div id="list-msg" class="msg" aria-live="polite"></div>
              <div id="insumos-list" class="list"></div>
            </section>
          </div>
        </section>
      </section>

      <!-- ✅ Toast (arriba derecha) -->
      <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>

      <!-- Modal: Editar insumo -->
      <div id="modal-edit" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
        <div class="modal">
          <header class="modal-header">
            <h3 id="modal-edit-title" class="modal-title">Editar insumo</h3>
            <button type="button" class="icon-btn" data-close="modal-edit" aria-label="Cerrar">✕</button>
          </header>

          <form id="edit-form" class="modal-body form">
            <input type="hidden" id="edit-id" />

            <label class="field">
              <span>Nombre</span>
              <input id="edit-nombre" type="text" required />
            </label>

            <label class="field">
              <span>Categoría</span>
              <select id="edit-categoria" class="select">
                <option value="">Seleccionar categoría...</option>
                ${INSUMO_CATEGORIAS.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
              </select>
            </label>

            <label class="field">
              <span>Unidad</span>
              <select id="edit-unidad" class="select">
                <option value="">Seleccionar unidad...</option>
                ${INSUMO_UNIDADES.map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("")}
              </select>
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

      <!-- Modal: Confirmar eliminación -->
      <div id="modal-delete" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
        <div class="modal">
          <header class="modal-header">
            <h3 id="modal-delete-title" class="modal-title">Eliminar insumo</h3>
            <button type="button" class="icon-btn" data-close="modal-delete" aria-label="Cerrar">✕</button>
          </header>

          <div class="modal-body">
            <p class="modal-text">
              ¿Seguro que querés eliminar <strong id="delete-name"></strong>?
              <br />
              El insumo quedará inactivo y no se borrará la información histórica.
            </p>

            <div id="delete-msg" class="msg" aria-live="polite"></div>

            <footer class="modal-footer">
              <button type="button" class="btn btn-ghost" data-close="modal-delete">Cancelar</button>
              <button id="delete-confirm" type="button" class="btn btn-danger">Eliminar</button>
            </footer>
          </div>
        </div>
      </div>
    </main>
  `;

  const listEl = document.querySelector("#insumos-list");
  const listMsg = document.querySelector("#list-msg");

  const form = document.querySelector("#insumo-form");
  const msg = document.querySelector("#insumo-msg");
  const btn = document.querySelector("#insumo-btn");

  // ✅ Toast
  const toastEl = document.querySelector("#toast");
  let toastTimer = null;

  function showToast(text, type = "success", ms = 2500) {
    if (!toastEl) return;

    if (toastTimer) clearTimeout(toastTimer);

    toastEl.textContent = text || "";
    toastEl.className = `toast ${type}`;
    toastEl.classList.remove("hidden");

    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, ms);
  }

  function setListMsg(text, type = "info") {
    listMsg.textContent = text || "";
    listMsg.className = `msg ${type}`;
  }

  function setFormMsg(text, type = "info") {
    msg.textContent = text || "";
    msg.className = `msg ${type}`;
  }

  function ensureOption(selectEl, value, labelPrefix = "(Actual) ") {
    const v = (value ?? "").trim();
    if (!v) return;

    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;

    // Si viene un valor “viejo” no incluido, lo agregamos para no perderlo
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = `${labelPrefix}${v}`;
    // insertamos después del placeholder
    selectEl.insertBefore(opt, selectEl.options[1] || null);
  }

  function renderList(items) {
    if (!items || items.length === 0) {
      listEl.innerHTML = `<div class="empty">No hay insumos cargados.</div>`;
      return;
    }

    listEl.innerHTML = items
      .map((i) => {
        const cat = i.categoria ? escapeHtml(i.categoria) : "";
        const uni = i.unidad ? escapeHtml(i.unidad) : "";
        const obs = i.observaciones ? i.observaciones : "";

        const meta = [cat, uni].filter(Boolean).join(" · ");

        return `
          <article class="item"
            data-id="${i.id}"
            data-nombre="${escapeHtml(i.nombre)}"
            data-categoria="${escapeHtml(i.categoria ?? "")}"
            data-unidad="${escapeHtml(i.unidad ?? "")}"
            data-observaciones="${escapeHtml(i.observaciones ?? "")}"
          >
            <div class="item-row">
              <div class="item-main">
                <div class="item-title">
                  <strong>${escapeHtml(i.nombre)}</strong>
                </div>

                ${meta ? `<div class="item-sub">${meta}</div>` : ``}
                ${obs ? `<div class="item-sub">${escapeHtml(obs)}</div>` : ``}
              </div>

              <div class="item-actions-inline">
                <button class="icon-action js-edit" type="button" title="Editar insumo" aria-label="Editar">✏️</button>
                <button class="icon-action danger js-delete" type="button" title="Eliminar insumo" aria-label="Eliminar">🗑️</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  listEl.addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;

    const id = item.getAttribute("data-id");
    if (!id) return;

    if (e.target.classList.contains("js-edit")) {
      const cat = item.getAttribute("data-categoria") || "";
      const uni = item.getAttribute("data-unidad") || "";

      document.querySelector("#edit-id").value = id;
      document.querySelector("#edit-nombre").value = item.getAttribute("data-nombre") || "";

      const editCatSel = document.querySelector("#edit-categoria");
      ensureOption(editCatSel, cat);
      editCatSel.value = cat || "";

      const editUniSel = document.querySelector("#edit-unidad");
      ensureOption(editUniSel, uni);
      editUniSel.value = uni || "";

      document.querySelector("#edit-obs").value = item.getAttribute("data-observaciones") || "";
      document.querySelector("#edit-msg").textContent = "";
      openModal(modalEdit);
      return;
    }

    if (e.target.classList.contains("js-delete")) {
      document.querySelector("#delete-confirm").setAttribute("data-id", id);
      document.querySelector("#delete-name").textContent =
        item.getAttribute("data-nombre") || "este insumo";
      document.querySelector("#delete-msg").textContent = "";
      openModal(modalDelete);
      return;
    }
  });

  const modalEdit = document.querySelector("#modal-edit");
  const modalDelete = document.querySelector("#modal-delete");

  function openModal(modalEl) {
    modalEl.classList.remove("hidden");
    modalEl.querySelector(".modal")?.focus?.();
    document.body.classList.add("no-scroll");
  }

  function closeModal(modalEl) {
    modalEl.classList.add("hidden");
    document.body.classList.remove("no-scroll");
  }

  function closeAllModals() {
    closeModal(modalEdit);
    closeModal(modalDelete);
  }

  [modalEdit, modalDelete].forEach((m) => {
    m.addEventListener("click", (e) => {
      const target = e.target;
      const closeId = target?.getAttribute?.("data-close");
      if (closeId) closeModal(document.querySelector(`#${closeId}`));
      if (target.classList.contains("modal-backdrop")) closeModal(m);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });

  async function loadInsumos() {
    if (!BACKEND_URL) {
      setListMsg("Falta configurar VITE_BACKEND_URL", "error");
      return;
    }

    setListMsg("Cargando...", "info");
    try {
      const resp = await fetch(`${BACKEND_URL}/insumos`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setListMsg(data?.message || data?.error || "No se pudieron cargar los insumos.", "error");
        renderList([]);
        return;
      }

      setListMsg("", "info");
      renderList(data.data || []);
    } catch (e) {
      console.error(e);
      setListMsg("Error de conexión con el servidor.", "error");
      renderList([]);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormMsg("", "info");

    const nombre = document.querySelector("#insumo-nombre").value.trim();
    const categoria = document.querySelector("#insumo-categoria").value.trim();
    const unidad = document.querySelector("#insumo-unidad").value.trim();
    const observaciones = document.querySelector("#insumo-obs").value.trim();

    if (!nombre) return setFormMsg("El nombre es obligatorio.", "error");

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Creando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/insumos`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          categoria: categoria || null,
          unidad: unidad || null,
          observaciones: observaciones || null,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        if (resp.status === 409 && data?.code === "INSUMO_DUPLICADO") {
          setFormMsg(data?.message || "Ya existe un insumo activo con ese nombre.", "error");
          return;
        }
        setFormMsg(data?.message || data?.error || "No se pudo crear el insumo.", "error");
        return;
      }

      setFormMsg("", "info");
      showToast("Insumo creado ✅", "success", 2500);

      form.reset();
      await loadInsumos();
    } catch (err) {
      console.error(err);
      setFormMsg("Error de conexión con el servidor.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  const editForm = document.querySelector("#edit-form");
  const editMsg = document.querySelector("#edit-msg");
  const editSaveBtn = document.querySelector("#edit-save");

  function setEditMsg(text, type = "info") {
    editMsg.textContent = text || "";
    editMsg.className = `msg ${type}`;
  }

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setEditMsg("", "info");

    const id = document.querySelector("#edit-id").value;
    const nombre = document.querySelector("#edit-nombre").value.trim();
    const categoria = document.querySelector("#edit-categoria").value.trim();
    const unidad = document.querySelector("#edit-unidad").value.trim();
    const observaciones = document.querySelector("#edit-obs").value.trim();

    if (!nombre) return setEditMsg("El nombre es obligatorio.", "error");

    editSaveBtn.disabled = true;
    const original = editSaveBtn.textContent;
    editSaveBtn.textContent = "Guardando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/insumos/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          categoria: categoria || null,
          unidad: unidad || null,
          observaciones: observaciones || null,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        if (resp.status === 409 && data?.code === "INSUMO_DUPLICADO") {
          setEditMsg(data?.message || "Ya existe un insumo activo con ese nombre.", "error");
          return;
        }
        setEditMsg(data?.message || data?.error || "No se pudo guardar.", "error");
        return;
      }

      closeModal(modalEdit);
      await loadInsumos();

      showToast("Insumo actualizado ✅", "success", 2500);
    } catch (err) {
      console.error(err);
      setEditMsg("Error de conexión.", "error");
    } finally {
      editSaveBtn.disabled = false;
      editSaveBtn.textContent = original;
    }
  });

  const deleteBtn = document.querySelector("#delete-confirm");
  const deleteMsg = document.querySelector("#delete-msg");

  function setDeleteMsg(text, type = "info") {
    deleteMsg.textContent = text || "";
    deleteMsg.className = `msg ${type}`;
  }

  deleteBtn.addEventListener("click", async () => {
    const id = deleteBtn.getAttribute("data-id");
    if (!id) return;

    deleteBtn.disabled = true;
    const original = deleteBtn.textContent;
    deleteBtn.textContent = "Eliminando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/insumos/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setDeleteMsg(data?.message || data?.error || "No se pudo eliminar.", "error");
        return;
      }

      closeModal(modalDelete);
      await loadInsumos();

      showToast("Insumo eliminado ✅", "success", 2500);
    } catch (err) {
      console.error(err);
      setDeleteMsg("Error de conexión.", "error");
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = original;
    }
  });

  wireTopbar({
    onGoCampos: () => onGoCampos?.(),
    onGoCultivos: () => onGoCultivos?.(),
    onGoInsumos: () => {}, // ya estás en Insumos
    onRefresh: loadInsumos,
    onLogout: () => {
      logout();
      onLogout?.();
    },
  });

  loadInsumos();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}