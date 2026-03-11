import { Application } from "@hotwired/stimulus"

import ThemeController   from "./theme_controller.js"
import ClockController   from "./clock_controller.js"
import PageController    from "./page_controller.js"
import RamenController   from "./ramen_controller.js"
import ChatbotController from "./chatbot_controller.js"

const application = Application.start()

application.register("theme",   ThemeController)
application.register("clock",   ClockController)
application.register("page",    PageController)
application.register("ramen",   RamenController)
application.register("chatbot", ChatbotController)
