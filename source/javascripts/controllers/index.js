import { Application } from '@hotwired/stimulus'
import ChatbotController from './chatbot_controller.js'

const application = Application.start()
application.register('chatbot', ChatbotController)
