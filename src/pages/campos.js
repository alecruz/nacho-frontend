// src/pages/campos.js
import { getAuthHeaders, logout } from "../auth/auth";

export function renderCamposPage({ BACKEND_URL, onLogout }) {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <main class="page">
      <section class="card card-wide">
        <header class="header header-row">
          <div>
            <h1>Campos</h1>
            <p>Listado de campos del cliente.</p>
          </div>

          <div class="actions">
            <button id="refresh" class="btn btn-ghost" type="button">Actualizar</button>
            <button id="logout" class="btn btn-ghost" type="button">Cerrar sesión</button>
            <button id="go-cultivos" class="btn btn-ghost" type="button">Cultivos</button>
          </div>
        </header>

        <div class="grid">
          <section class="panel">
            <h2 class="h2">Nuevo campo</h2>

            <form id="campo-form" class="form">
              <label class="field">
                <span>Nombre</span>
                <input id="campo-nombre" type="text" required />
              </label>

              <label class="field">
                <span>Superficie (ha)</span>
                <input id="campo-superficie" type="number" step="0.01" min="0" required />
              </label>

              <label class="field">
                <span>Observaciones</span>
                <textarea id="campo-obs" rows="3"></textarea>
              </label>

              <button id="campo-btn" class="btn" type="submit">Crear campo</button>
              <div id="campo-msg" class="msg" aria-live="polite"></div>
            </form>
          </section>

          <section class="panel">
            <h2 class="h2">Tus campos</h2>
            <div id="list-msg" class="msg" aria-live="polite"></div>
            <div id="campos-list" class="list"></div>
          </section>
        </div>
      </section>

      <!-- Modal: Editar campo -->
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

      <!-- Modal: Confirmar eliminación -->
      <div id="modal-delete" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
        <div class="modal">
          <header class="modal-header">
            <h3 id="modal-delete-title" class="modal-title">Eliminar campo</h3>
            <button type="button" class="icon-btn" data-close="modal-delete" aria-label="Cerrar">✕</button>
          </header>

          <div class="modal-body">
            <p class="modal-text">
              ¿Seguro que querés eliminar <strong id="delete-name"></strong>?
              <br />
              El campo quedará inactivo y no se borrará la información histórica.
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

  const refreshBtn = document.querySelector("#refresh");
  const logoutBtn = document.querySelector("#logout");
  const goCultivosBtn = document.querySelector("#go-cultivos");

  const listEl = document.querySelector("#campos-list");
  const listMsg = document.querySelector("#list-msg");

  const form = document.querySelector("#campo-form");
  const msg = document.querySelector("#campo-msg");
  const btn = document.querySelector("#campo-btn");

  function setListMsg(text, type = "info") {
    listMsg.textContent = text || "";
    listMsg.className = `msg ${type}`;
  }

  function setFormMsg(text, type = "info") {
    msg.textContent = text || "";
    msg.className = `msg ${type}`;
  }

  function renderList(items) {
    if (!items || items.length === 0) {
      listEl.innerHTML = `<div class="empty">No hay campos cargados.</div>`;
      return;
    }

    listEl.innerHTML = items
      .map((c) => {
        const sup = c.superficie != null ? Number(c.superficie).toFixed(2) : "-";
        const obs = c.observaciones ? c.observaciones : "";
        return `
          <article class="item" 
            data-id="${c.id}"
            data-nombre="${escapeHtml(c.nombre)}"
            data-superficie="${c.superficie ?? ""}"
            data-observaciones="${escapeHtml(c.observaciones ?? "")}"
          >           
            <div class="item-row">
              <div class="item-main">
                <div class="item-title">
                  <strong>${escapeHtml(c.nombre)}</strong>
                  <span class="pill">${sup} ha</span>
                </div>

                ${obs ? `<div class="item-sub">${escapeHtml(obs)}</div>` : ``}
              </div>

              <div class="item-actions-inline">
                <button
                  class="icon-action js-edit"
                  type="button"
                  title="Editar campo"
                  aria-label="Editar"
                >✏️</button>

                <button
                  class="icon-action danger js-delete"
                  type="button"
                  title="Eliminar campo"
                  aria-label="Eliminar"
                >🗑️</button>
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

    // EDITAR
    if (e.target.classList.contains("js-edit")) {
      // Prellenar modal
      document.querySelector("#edit-id").value = id;
      document.querySelector("#edit-nombre").value = item.getAttribute("data-nombre") || "";
      document.querySelector("#edit-superficie").value = item.getAttribute("data-superficie") || "";
      document.querySelector("#edit-obs").value = item.getAttribute("data-observaciones") || "";
      document.querySelector("#edit-msg").textContent = "";
      openModal(modalEdit);
      return;
    }

    // ELIMINAR
    if (e.target.classList.contains("js-delete")) {
      document.querySelector("#delete-confirm").setAttribute("data-id", id);
      document.querySelector("#delete-name").textContent = item.getAttribute("data-nombre") || "este campo";
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

  // Cerrar modal: click en backdrop o botones con data-close
  [modalEdit, modalDelete].forEach((m) => {
    m.addEventListener("click", (e) => {
      const target = e.target;
      const closeId = target?.getAttribute?.("data-close");
      if (closeId) closeModal(document.querySelector(`#${closeId}`));
      if (target.classList.contains("modal-backdrop")) closeModal(m);
    });
  });

  // Cerrar con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });

  async function loadCampos() {
    if (!BACKEND_URL) {
      setListMsg("Falta configurar VITE_BACKEND_URL", "error");
      return;
    }

    setListMsg("Cargando...", "info");
    try {
      const resp = await fetch(`${BACKEND_URL}/campos`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        // token inválido/expirado
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setListMsg(data.error || "No se pudieron cargar los campos.", "error");
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

    const nombre = document.querySelector("#campo-nombre").value.trim();
    const superficieRaw = document.querySelector("#campo-superficie").value;
    const observaciones = document.querySelector("#campo-obs").value.trim();

    if (!nombre) {
      setFormMsg("El nombre es obligatorio.", "error");
      return;
    }

    if (!superficieRaw) {
      setFormMsg("La superficie es obligatoria.", "error");
      return;
    }

    const superficie = Number(superficieRaw);
    if (Number.isNaN(superficie) || superficie <= 0) {
      setFormMsg("La superficie debe ser un número mayor a 0.", "error");
      return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Creando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/campos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ nombre, superficie, observaciones }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.status === 401) {
        localStorage.removeItem("token");
        onLogout?.();
        return;
      }

      if (!resp.ok) {
        setFormMsg(data.error || "No se pudo crear el campo.", "error");
        return;
      }

      setFormMsg("Campo creado ✅", "success");
      form.reset();
      await loadCampos();
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
    const superficieRaw = document.querySelector("#edit-superficie").value;
    const observaciones = document.querySelector("#edit-obs").value.trim();

    if (!nombre) {
      setEditMsg("El nombre es obligatorio.", "error");
      return;
    }

    if (!superficieRaw) {
      setEditMsg("La superficie es obligatoria.", "error");
      return;
    }

    const superficie = Number(superficieRaw);
    if (Number.isNaN(superficie) || superficie <= 0) {
      setEditMsg("La superficie debe ser un número mayor a 0.", "error");
      return;
    }

    editSaveBtn.disabled = true;
    const original = editSaveBtn.textContent;
    editSaveBtn.textContent = "Guardando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/campos/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ nombre, superficie, observaciones }),
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

      setEditMsg("Guardado ✅", "success");
      closeModal(modalEdit);
      await loadCampos();
      setListMsg("Campo actualizado ✅", "success");
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
      const resp = await fetch(`${BACKEND_URL}/campos/${id}`, {
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
        setDeleteMsg(data.error || "No se pudo eliminar.", "error");
        return;
      }

      closeModal(modalDelete);
      await loadCampos();
      setListMsg("Campo eliminado ✅", "success");
    } catch (err) {
      console.error(err);
      setDeleteMsg("Error de conexión.", "error");
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = original;
    }
  });

  goCultivosBtn.addEventListener("click", () => onGoCultivos?.());

  refreshBtn.addEventListener("click", loadCampos);

  logoutBtn.addEventListener("click", () => {
    logout();
    onLogout?.();
  });

  loadCampos();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
