import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["nav"]

  connect() {
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view")
          }
        })
      },
      { threshold: 0.08 }
    )

    document.querySelectorAll(".reveal").forEach(el => this.observer.observe(el))

    this.scrollHandler = () => {
      if (this.hasNavTarget) {
        const scrolled = window.scrollY > 10
        this.navTarget.style.borderBottomColor = scrolled ? "var(--border)" : "transparent"
        this.navTarget.style.backdropFilter = scrolled ? "blur(12px)" : "none"
      }
    }

    window.addEventListener("scroll", this.scrollHandler, { passive: true })
  }

  disconnect() {
    this.observer.disconnect()
    window.removeEventListener("scroll", this.scrollHandler)
  }
}
