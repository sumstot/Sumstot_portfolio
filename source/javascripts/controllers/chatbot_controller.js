import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "container",
    "toggleButton",
    "closeButton",
    "messages",
    "messageInput",
    "sendButton",
    "typingIndicator"
  ]

  static values = {
    apiUrl: String,
    isOpen: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false }
  }

  static classes = ["show"]

  toggle() {
    this.isOpenValue = !this.isOpenValue
    this.updateVisibility()
  }

  open() {
    if (!this.isOpenValue) {
      this.isOpenValue = true
      this.updateVisibility()
    }
  }

  close() {
    if (this.isOpenValue) {
      this.isOpenValue = false
      this.updateVisibility()
    }
  }

  updateVisibility() {
    if (this.isOpenValue) {
      this.containerTarget.classList.add("show")
      this.toggleButtonTarget.style.display = "none"

      setTimeout(() => {
        this.messageInputTarget.focus()
      }, 300)
    } else {
      this.containerTarget.classList.remove("show")
      this.toggleButtonTarget.style.display = "block"
    }
  }

  async sendMessage() {
    if (this.isLoadingValue) return

    const message = this.messageInputTarget.value.trim()
    if (!message) return

    this.addUserMessage(message)
    this.clearInput()
    this.setLoadingState(true)

    try {
      const botResponse = await this.fetchBotResponse(message)
      this.addBotMessage(botResponse)
    } catch (error) {
      this.addBotMessage('Sorry, I couldn\'t connect right now. Please try again later or contact Soren directly!')
      console.error('Chat API error:', error)
    } finally {
      this.setLoadingState(false)
    }
  }

  handleKeydown(event) {
    if (event.key === 'Enter' && !this.isLoadingValue) {
      event.preventDefault()
      this.sendMessage()
    }
  }

  addUserMessage(text) {
    this.addMessage(text, true)
  }

  addBotMessage(text) {
    this.addMessage(text, false)
  }

  addMessage(text, isUser = false) {
    if (!this.hasMessagesTarget || !text) return

    const messageDiv = document.createElement('div')
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`
    messageDiv.textContent = text

    this.messagesTarget.appendChild(messageDiv)
    this.scrollToBottom()
  }

  scrollToBottom() {
    if (this.hasMessagesTarget) {
      this.messagesTarget.scrollTop = this.messagesTarget.scrollHeight
    }
  }

  clearMessages() {
    if (this.hasMessagesTarget) {
      this.messagesTarget.innerHTML = ''
    }
  }

  clearInput() {
    if (this.hasMessageInputTarget) {
      this.messageInputTarget.value = ''
    }
  }

  setLoadingState(loading) {
    this.isLoadingValue = loading

    if (this.hasSendButtonTarget) {
      this.sendButtonTarget.disabled = loading
      this.sendButtonTarget.textContent = loading ? '...' : 'Send'
    }

    if (this.hasTypingIndicatorTarget) {
      this.typingIndicatorTarget.style.display = loading ? 'block' : 'none'
    }

    if (loading) {
      this.scrollToBottom()
    } else if (this.hasMessageInputTarget) {
      this.messageInputTarget.focus()
    }
  }

  async fetchBotResponse(message) {
    const response = await fetch(`${this.apiUrlValue}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    })

    const data = await response.json()

    if (response.ok) {
      return data.response
    } else {
      throw new Error(data.error || 'Something went wrong! Try again or contact Soren directly.')
    }
  }
  handleOutsideClick(event) {
    if (this.isOpenValue &&
        !this.element.contains(event.target) &&
        (!this.hasToggleButtonTarget || !this.toggleButtonTarget.contains(event.target))) {
      this.close()
    }
  }

  preventClose(event) {
    event.stopPropagation()
  }
}
