// src/pages/cultivos.js
import { getAuthHeaders, logout } from "../auth/auth";
import { renderTopbar, wireTopbar } from "../ui/header";

export function renderCultivosPage({ BACKEND_URL, onLogout, onGoCampos }) {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <main class="shell">
      ${renderTopbar({ active: "cultivos" })}

      <section class="content">
        <section class="card card-wide">
          <header class="header">
            <div>
              <h1>Cultivos</h1>
              <p>Gestioná el catálogo de cultivos del cliente.</p>
            </div>
          </header>

          <div class="grid">
            <section class="panel">
              <h2 class="h2">Nuevo cultivo</h2>

              <form id="cultivo-form" class="form">
                <label class="field">
                  <span>Nombre</span>
                  <input id="cultivo-nombre" type="text" required />
                </label>

                <label class="field">
                  <span>Observaciones</span>
                  <textarea id="cultivo-obs" rows="3"></textarea>
                </label>

                <button id="cultivo-btn" class="btn" type="submit">Crear cultivo</button>
                <div id="cultivo-msg" class="msg" aria-live="polite"></div>
              </form>
            </section>

            <section class="panel">
              <h2 class="h2">Tus cultivos</h2>
              <div id="list-msg" class="msg" aria-live="polite"></div>
              <div id="cultivos-list" class="list"></div>
            </section>
          </div>
        </section>
      </section>

      <!-- ✅ Toast (arriba a la derecha) -->
      <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>

      <!-- Modal: Editar cultivo -->
      <div id="modal-edit" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
        <div class="modal" tabindex="-1">
          <header class="modal-header">
            <h3 id="modal-edit-title" class="modal-title">Editar cultivo</h3>
            <button type="button" class="icon-btn" data-close="modal-edit" aria-label="Cerrar">✕</button>
          </header>

          <form id="edit-form" class="modal-body form">
            <input type="hidden" id="edit-id" />

            <label class="field">
              <span>Nombre</span>
              <input id="edit-nombre" type="text" required />
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
        <div class="modal" tabindex="-1">
          <header class="modal-header">
            <h3 id="modal-delete-title" class="modal-title">Eliminar cultivo</h3>
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
    </main>
  `;

  /* =========================
     Toast helper
     ========================= */
  const toastEl = document.querySelector("#toast");
  let toastTimer = null;

  function showToast(text, type = "success", ms = 2400) {
    if (!toastEl) return;

    if (toastTimer) clearTimeout(toastTimer);

    toastEl.textContent = text || "";
    toastEl.className = `toast ${type}`; // base + variante
    toastEl.classList.remove("hidden");

    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, ms);
  }

  /* =========================
     List / Form refs
     ========================= */
  const listEl = document.querySelector("#cultivos-list");
  const listMsg = document.querySelector("#list-msg");

  const form = document.querySelector("#cultivo-form");
  const msg = document.querySelector("#cultivo-msg");
  const btn = document.querySelector("#cultivo-btn");

  const modalEdit = document.querySelector("#modal-edit");
  const modalDelete = document.querySelector("#modal-delete");

  const editForm = document.querySelector("#edit-form");
  const editId = document.querySelector("#edit-id");
  const editNombre = document.querySelector("#edit-nombre");
  const editObs = document.querySelector("#edit-obs");
  const editMsg = document.querySelector("#edit-msg");
  const editSaveBtn = document.querySelector("#edit-save");

  const deleteName = document.querySelector("#delete-name");
  const deleteMsg = document.querySelector("#delete-msg");
  const deleteBtn = document.querySelector("#delete-confirm");

  function setListMsg(text, type = "info") {
    listMsg.textContent = text || "";
    listMsg.className = `msg ${type}`;
  }

  function setFormMsg(text, type = "info") {
    msg.textContent = text || "";
    msg.className = `msg ${type}`;
  }

  function setEditMsg(text, type = "info") {
    editMsg.textContent = text || "";
    editMsg.className = `msg ${type}`;
  }

  function setDeleteMsg(text, type = "info") {
    deleteMsg.textContent = text || "";
    deleteMsg.className = `msg ${type}`;
  }

  function openModal(modalEl) {
    modalEl.classList.remove("hidden");
    document.body.classList.add("no-scroll");
    setTimeout(() => modalEl.querySelector(".modal")?.focus(), 0);
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

  function renderList(items) {
    if (!items || items.length === 0) {
      listEl.innerHTML = `<div class="empty">No hay cultivos cargados.</div>`;
      return;
    }

    listEl.innerHTML = items
      .map((c) => {
        const obs = c.observaciones ? c.observaciones : "";
        return `
          <article class="item"
            data-id="${c.id}"
            data-nombre="${escapeHtml(c.nombre)}"
            data-observaciones="${escapeHtml(c.observaciones ?? "")}"
          >
            <div class="item-row">
              <div class="item-main">
                <div class="item-title">
                  <strong>${escapeHtml(c.nombre)}</strong>
                </div>

                ${obs ? `<div class="item-sub">${escapeHtml(obs)}</div>` : ``}
              </div>

              <div class="item-actions-inline">
                <button class="icon-action js-edit" type="button" title="Editar" aria-label="Editar">✏️</button>
                <button class="icon-action danger js-delete" type="button" title="Desactivar" aria-label="Desactivar">🗑️</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadCultivos() {
    if (!BACKEND_URL) {
      setListMsg("Falta configurar VITE_BACKEND_URL", "error");
      return;
    }

    setListMsg("Cargando...", "info");

    try {
      const resp = await fetch(`${BACKEND_URL}/cultivos`, {
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
        setListMsg(data.error || "No se pudieron cargar los cultivos.", "error");
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

  // Delegation: open modals from list buttons
  listEl.addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;

    const id = item.getAttribute("data-id");
    if (!id) return;

    if (e.target.classList.contains("js-edit")) {
      editId.value = id;
      editNombre.value = item.getAttribute("data-nombre") || "";
      editObs.value = item.getAttribute("data-observaciones") || "";
      setEditMsg("", "info");
      openModal(modalEdit);
      return;
    }

    if (e.target.classList.contains("js-delete")) {
      deleteBtn.setAttribute("data-id", id);
      deleteName.textContent = item.getAttribute("data-nombre") || "este cultivo";
      setDeleteMsg("", "info");
      openModal(modalDelete);
      return;
    }
  });

  // Create cultivo
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormMsg("", "info");

    const nombre = document.querySelector("#cultivo-nombre").value.trim();
    const observaciones = document.querySelector("#cultivo-obs").value.trim();

    if (!nombre) {
      setFormMsg("El nombre es obligatorio.", "error");
      return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Creando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/cultivos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ nombre, observaciones }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setFormMsg(data.error || "No se pudo crear el cultivo.", "error");
        return;
      }

      // ✅ Toast arriba a la derecha (en vez de msg debajo del botón)
      setFormMsg("", "info");
      showToast("Cultivo creado ✅", "success");
      form.reset();
      await loadCultivos();
    } catch (err) {
      console.error(err);
      setFormMsg("Error de conexión con el servidor.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // Save edit (PUT)
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setEditMsg("", "info");

    const id = editId.value;
    const nombre = editNombre.value.trim();
    const observaciones = editObs.value.trim();

    if (!nombre) {
      setEditMsg("El nombre es obligatorio.", "error");
      return;
    }

    editSaveBtn.disabled = true;
    const original = editSaveBtn.textContent;
    editSaveBtn.textContent = "Guardando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/cultivos/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ nombre, observaciones }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setEditMsg(data.error || "No se pudo guardar.", "error");
        return;
      }

      closeModal(modalEdit);
      await loadCultivos();

      // ✅ Toast sutil
      setListMsg("", "info");
      showToast("Cultivo actualizado ✅", "success");
    } catch (err) {
      console.error(err);
      setEditMsg("Error de conexión.", "error");
    } finally {
      editSaveBtn.disabled = false;
      editSaveBtn.textContent = original;
    }
  });

  // Confirm deactivate (DELETE -> soft delete)
  deleteBtn.addEventListener("click", async () => {
    const id = deleteBtn.getAttribute("data-id");
    if (!id) return;

    deleteBtn.disabled = true;
    const original = deleteBtn.textContent;
    deleteBtn.textContent = "Desactivando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/cultivos/${id}`, {
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
        setDeleteMsg(data.error || "No se pudo desactivar.", "error");
        return;
      }

      closeModal(modalDelete);
      await loadCultivos();

      // ✅ Toast sutil
      setListMsg("", "info");
      showToast("Cultivo desactivado ✅", "success");
    } catch (err) {
      console.error(err);
      setDeleteMsg("Error de conexión.", "error");
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = original;
    }
  });

  // ✅ Conectar Topbar
  wireTopbar({
    onGoCampos: () => onGoCampos?.(),
    onGoCultivos: () => {}, // ya estás en Cultivos
    onRefresh: loadCultivos,
    onLogout: () => {
      logout();
      onLogout?.();
    },
  });

  loadCultivos();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
