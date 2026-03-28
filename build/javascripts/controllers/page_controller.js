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

    // Smooth nav link scrolling with custom duration
    this.navClickHandler = (e) => {
      const link = e.target.closest('a[href^="#"]')
      if (!link) return
      const target = document.querySelector(link.getAttribute("href"))
      if (!target) return
      e.preventDefault()
      this.smoothScrollTo(target, 900)
    }
    document.addEventListener("click", this.navClickHandler)
  }

  smoothScrollTo(target, duration) {
    const start = window.scrollY
    const end = target.getBoundingClientRect().top + window.scrollY - 72 // nav offset
    const distance = end - start
    let startTime = null

    const easeInOutCubic = t =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      window.scrollTo(0, start + distance * easeInOutCubic(progress))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }

  disconnect() {
    this.observer.disconnect()
    window.removeEventListener("scroll", this.scrollHandler)
    document.removeEventListener("click", this.navClickHandler)
  }
}
