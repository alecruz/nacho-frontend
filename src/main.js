import "./style.css";
import { isAuthenticated } from "./auth/auth";
import { renderCamposPage } from "./pages/campos";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const app = document.querySelector("#app");

function goToCampos() {
  renderCamposPage({
    BACKEND_URL,
    onLogout: () => renderLoginPage(),
  });
}

function renderLoginPage() {
  app.innerHTML = `
    <main class="page">
      <section class="card">
        <header class="header">
          <h1>Iniciar sesión</h1>
          <p>Ingresá con tu usuario y contraseña.</p>
        </header>

        <form id="login-form" class="form">
          <label class="field">
            <span>Usuario</span>
            <input id="usuario" name="usuario" type="text" autocomplete="username" required />
          </label>

          <label class="field">
            <span>Contraseña</span>
            <input id="password" name="password" type="password" autocomplete="current-password" required />
          </label>

          <button id="login-button" class="btn" type="submit">Ingresar</button>

          <div id="msg" class="msg" aria-live="polite"></div>
        </form>

        <footer class="footer">
          <small>© ${new Date().getFullYear()} Sistema de Gestión</small>
        </footer>
      </section>
    </main>
  `;

  const form = document.querySelector("#login-form");
  const msg = document.querySelector("#msg");
  const btn = document.querySelector("#login-button");

  function setMsg(text, type = "info") {
    msg.textContent = text || "";
    msg.className = `msg ${type}`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.querySelector("#usuario").value.trim();
    const password = document.querySelector("#password").value;

    if (!BACKEND_URL) {
      setMsg("Falta configurar VITE_BACKEND_URL en Vercel/.env", "error");
      return;
    }

    if (!usuario || !password) {
      setMsg("Completá usuario y contraseña.", "error");
      return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Ingresando...";

    try {
      const resp = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setMsg(data.error || "No se pudo iniciar sesión.", "error");
        return;
      }

      // Guardar token (para usarlo luego en el resto del sistema)
      localStorage.setItem("token", data.token);

      setMsg("Login exitoso ✅", "success");

      goToCampos();

      // Próximo paso: redirigir cuando exista dashboard
      // window.location.href = "/dashboard.html";
    } catch (err) {
      console.error(err);
      setMsg("Error de conexión con el servidor.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

if (isAuthenticated()) {
  goToCampos();
} else {
  renderLoginPage();
}
