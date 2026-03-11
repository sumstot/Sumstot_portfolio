import { Controller } from "@hotwired/stimulus"

const FALLBACK = [
  { name: "Ichiran Shinsaibashi", genre: "Tonkotsu", score: "4.8", area: "Osaka" },
  { name: "Fuunji",               genre: "Tsukemen", score: "4.9", area: "Tokyo" },
  { name: "Afuri Harajuku",       genre: "Yuzu Shio", score: "4.7", area: "Tokyo" },
]

export default class extends Controller {
  static targets = ["grid"]

  connect() {
    this.loadRamen()
  }

  async loadRamen() {
    try {
      const res = await fetch(
        "https://theramenranger.com/api/v1/restaurants?limit=3&sort=score",
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) throw new Error("API error")
      const data = await res.json()
      this.renderCards(data.restaurants || data)
    } catch {
      this.renderCards(FALLBACK)
    }
  }

  renderCards(shops) {
    this.gridTarget.innerHTML = shops.map(shop => {
      const imgHtml = shop.image
        ? `<img src="${shop.image}" alt="${shop.name}" class="ramen-img">`
        : `<div class="ramen-img" style="background: var(--bg2); display:flex; align-items:center; justify-content:center; font-size:2.5rem;">🍜</div>`

      return `
        <div class="ramen-card">
          ${imgHtml}
          <div style="padding: 1rem;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:.5rem; margin-bottom:.25rem;">
              <h3 style="font-size:.875rem; font-weight:600; color:var(--fg);">${shop.name}</h3>
              <span style="font-size:.75rem; font-family:monospace; color:var(--em); flex-shrink:0;">★ ${shop.score || "—"}</span>
            </div>
            <p style="font-size:.75rem; color:var(--muted);">${shop.genre || shop.type || ""} · ${shop.area || shop.location || ""}</p>
          </div>
        </div>
      `
    }).join("")
  }
}
