import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "toggleBtn", "messages", "input", "send", "typingDots"]

  static values = {
    apiUrl:    String,
    isOpen:    { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
  }

  toggle() {
    this.isOpenValue ? this.close() : this.open()
  }

  open() {
    this.isOpenValue = true
    this.panelTarget.classList.add("open")
    this.toggleBtnTarget.style.display = "none"
    setTimeout(() => { if (this.hasInputTarget) this.inputTarget.focus() }, 280)
  }

  close() {
    this.isOpenValue = false
    this.panelTarget.classList.remove("open")
    this.toggleBtnTarget.style.display = "flex"
  }

  async sendMessage() {
    if (this.isLoadingValue) return

    const message = this.inputTarget.value.trim()
    if (!message) return

    this.addMessage(message, true)
    this.inputTarget.value = ""
    this.setLoading(true)

    try {
      const response = await this.fetchBotResponse(message)
      this.addMessage(response, false)
    } catch {
      this.addMessage("Sorry, I couldn't connect right now. Please try again later or contact Soren directly!", false)
    } finally {
      this.setLoading(false)
    }
  }

  handleKeydown(event) {
    if (event.key === "Enter" && !this.isLoadingValue) {
      event.preventDefault()
      this.sendMessage()
    }
  }

  handleOutsideClick(event) {
    if (this.isOpenValue && !this.element.contains(event.target)) {
      this.close()
    }
  }

  preventClose(event) {
    event.stopPropagation()
  }

  addMessage(text, isUser) {
    const div = document.createElement("div")
    div.className = isUser ? "msg-user" : "msg-bot"
    div.textContent = text
    this.messagesTarget.appendChild(div)
    this.messagesTarget.scrollTop = this.messagesTarget.scrollHeight
  }

  setLoading(loading) {
    this.isLoadingValue = loading

    if (this.hasSendTarget) {
      this.sendTarget.disabled = loading
      this.sendTarget.textContent = loading ? "…" : "Send"
    }

    if (this.hasTypingDotsTarget) {
      this.typingDotsTarget.classList.toggle("hidden", !loading)
      if (loading) {
        this.messagesTarget.scrollTop = this.messagesTarget.scrollHeight
      }
    }

    if (!loading && this.hasInputTarget) {
      this.inputTarget.focus()
    }
  }

  async fetchBotResponse(message) {
    const res = await fetch(`${this.apiUrlValue}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })
    const data = await res.json()
    if (res.ok) return data.response
    throw new Error(data.error || "Unknown error")
  }
}
