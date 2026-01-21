import "./style.css";
import { isAuthenticated } from "./auth/auth";
import { renderCamposPage } from "./pages/campos";
import { renderCultivosPage } from "./pages/cultivos";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const app = document.querySelector("#app");

function goToCampos() {
  renderCamposPage({
    BACKEND_URL,
    onLogout: () => renderLoginPage(),
    onGoCultivos: () => goToCultivos(),
  });
}

function goToCultivos() {
  renderCultivosPage({
    BACKEND_URL,
    onLogout: () => renderLoginPage(),
    onGoCampos: () => goToCampos(),
  });
}

function renderLoginPage() {
  app.innerHTML = `
    <main class="login-page">
      <section class="login-card" aria-label="Inicio de sesión">
        <header class="login-header">
          <h1>Bienvenido</h1>
          <p>Inicia sesión para continuar</p>
        </header>

        <form id="login-form" class="login-form">
          <label class="field">
            <span class="sr-only">Usuario</span>
            <div class="input-wrap">
              <span class="icon" aria-hidden="true">👤</span>
              <input
                id="usuario"
                name="usuario"
                type="text"
                autocomplete="username"
                placeholder="Usuario"
                required
              />
            </div>
          </label>

          <label class="field">
            <span class="sr-only">Contraseña</span>
            <div class="input-wrap">
              <span class="icon" aria-hidden="true">🔒</span>
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                placeholder="Contraseña"
                required
              />
            </div>
          </label>

          <button id="login-button" class="btn-primary" type="submit">Ingresar</button>

          <div id="msg" class="msg" aria-live="polite"></div>

          <a class="login-link" href="#" onclick="return false;">¿Olvidaste tu contraseña?</a>
        </form>

        <footer class="login-footer">
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

      localStorage.setItem("token", data.token);

      setMsg("Login exitoso ✅", "success");
      goToCampos();
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
