package in.strikes.rag_ecommerce_support.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import in.strikes.rag_ecommerce_support.service.ChatbotService;

@RestController
public class ChatbotController {
    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService){
        this.chatbotService = chatbotService;
    }

    @GetMapping ("/query")
    public String ask(@RequestParam String query){
        return chatbotService.answerUserQuery(query);
    }
}
