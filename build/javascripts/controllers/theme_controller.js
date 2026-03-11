import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toggleBtn", "sunIcon", "moonIcon", "label"]

  connect() {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const dark = stored ? stored === "dark" : prefersDark
    this.applyTheme(dark)
  }

  toggle() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light"
    this.applyTheme(!isDark)
    localStorage.setItem("theme", !isDark ? "dark" : "light")
  }

  applyTheme(dark) {
    if (dark) {
      document.documentElement.removeAttribute("data-theme")
    } else {
      document.documentElement.setAttribute("data-theme", "light")
    }

    if (this.hasSunIconTarget) {
      this.sunIconTarget.classList.toggle("hidden", !dark)
      this.moonIconTarget.classList.toggle("hidden", dark)
    }

    if (this.hasLabelTarget) {
      this.labelTarget.textContent = dark ? "Dark" : "Light"
    }
  }
}
