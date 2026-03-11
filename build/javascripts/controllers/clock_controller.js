import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["display"]

  connect() {
    this.updateTime()
    this.timer = setInterval(() => this.updateTime(), 1000)
  }

  disconnect() {
    clearInterval(this.timer)
  }

  updateTime() {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    const time = fmt.format(new Date())

    this.displayTargets.forEach(el => {
      el.textContent = `${time} JST`
    })
  }
}
