// src/ui/header.js
export function renderTopbar({ active = "campos" }) {
  return `
    <header class="topbar">
      <div class="topbar__left">
        <img class="topbar__logo" src="/img/logo-iliagro.png" alt="ILIAGRO SOFT" />
        <div class="topbar__brand">
          <div class="topbar__name">ILIAGRO SOFT</div>
          <div class="topbar__tag">Sistema de Gestión Agropecuaria</div>
        </div>
      </div>

      <nav class="topbar__nav" aria-label="Navegación">
        <button id="nav-campos" class="tab ${active === "campos" ? "is-active" : ""}" type="button">
          Campos
        </button>
        <button id="nav-cultivos" class="tab ${active === "cultivos" ? "is-active" : ""}" type="button">
          Cultivos
        </button>
      </nav>

      <div class="topbar__right">
        <button id="nav-refresh" class="btn btn-ghost topbar__btn" type="button">Actualizar</button>
        <button id="nav-logout" class="btn btn-ghost topbar__btn" type="button">Salir</button>
      </div>
    </header>
  `;
}

export function wireTopbar({ onGoCampos, onGoCultivos, onRefresh, onLogout }) {
  document.querySelector("#nav-campos")?.addEventListener("click", () => onGoCampos?.());
  document.querySelector("#nav-cultivos")?.addEventListener("click", () => onGoCultivos?.());
  document.querySelector("#nav-refresh")?.addEventListener("click", () => onRefresh?.());
  document.querySelector("#nav-logout")?.addEventListener("click", () => onLogout?.());
}
