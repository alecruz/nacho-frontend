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
    </main>
  `;

  const refreshBtn = document.querySelector("#refresh");
  const logoutBtn = document.querySelector("#logout");

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
          <article class="item" data-id="${c.id}">
            <div class="item-top">
              <strong>${escapeHtml(c.nombre)}</strong>
              <span class="pill">${sup} ha</span>
            </div>

            ${obs ? `<div class="item-sub">${escapeHtml(obs)}</div>` : ``}

            <div class="item-actions">
              <button class="btn btn-small btn-ghost js-edit" type="button">Editar</button>
              <button class="btn btn-small btn-danger js-delete" type="button">Eliminar</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  listEl.addEventListener("click", async (e) => {
    const item = e.target.closest(".item");
    if (!item) return;

    const id = item.getAttribute("data-id");
    if (!id) return;

    // ELIMINAR
    if (e.target.classList.contains("js-delete")) {
      const ok = confirm("¿Eliminar este campo? Esta acción no se puede deshacer.");
      if (!ok) return;

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
          setListMsg(data.error || "No se pudo eliminar.", "error");
          return;
        }

        setListMsg("Campo eliminado ✅", "success");
        await loadCampos();
      } catch (err) {
        console.error(err);
        setListMsg("Error de conexión.", "error");
      }
    }

    // EDITAR
    if (e.target.classList.contains("js-edit")) {
      const nombreActual = item.querySelector("strong")?.textContent ?? "";
      const supActual = item.querySelector(".pill")?.textContent?.replace(" ha", "") ?? "";
      const obsActual = item.querySelector(".item-sub")?.textContent ?? "";

      const nuevoNombre = prompt("Nuevo nombre del campo:", nombreActual);
      if (nuevoNombre === null) return;

      const nuevaSup = prompt("Nueva superficie (ha):", supActual);
      if (nuevaSup === null) return;

      const supNum = Number(nuevaSup);
      if (!nuevoNombre.trim()) {
        setListMsg("El nombre no puede estar vacío.", "error");
        return;
      }
      if (Number.isNaN(supNum) || supNum <= 0) {
        setListMsg("La superficie debe ser un número mayor a 0.", "error");
        return;
      }

      const nuevasObs = prompt("Observaciones:", obsActual);
      if (nuevasObs === null) return;

      try {
        const resp = await fetch(`${BACKEND_URL}/campos/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            nombre: nuevoNombre.trim(),
            superficie: supNum,
            observaciones: nuevasObs.trim(),
          }),
        });

        const data = await resp.json().catch(() => ({}));

        if (resp.status === 401) {
          localStorage.removeItem("token");
          onLogout?.();
          return;
        }

        if (!resp.ok) {
          setListMsg(data.error || "No se pudo editar.", "error");
          return;
        }

        setListMsg("Campo actualizado ✅", "success");
        await loadCampos();
      } catch (err) {
        console.error(err);
        setListMsg("Error de conexión.", "error");
      }
    }
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
