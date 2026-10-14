package in.strikes.rag_ecommerce_support.service;

import jakarta.annotation.PostConstruct;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChatbotService {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    @Value("classpath*:knowledge/*.pdf")
    private Resource[] policyFiles;

    public ChatbotService(VectorStore vectorStore, ChatClient.Builder chatClientBuilder) {
        this.vectorStore = vectorStore;
        this.chatClient = chatClientBuilder.build();
    }

    @PostConstruct
    public void loadKnowledgeBase() {
        try {
            if (policyFiles == null || policyFiles.length == 0) {
                System.out.println("No policy PDF files found under classpath:knowledge/*.pdf");
                return;
            }

            List<Document> allChunks = new ArrayList<>();
            TokenTextSplitter splitter = TokenTextSplitter.builder()
                    .withChunkSize(300)
                    .build();

            for (Resource resource : policyFiles) {
                if (resource != null && resource.exists()) {
                    PagePdfDocumentReader reader = new PagePdfDocumentReader(resource);
                    List<Document> pages = reader.read();
                    List<Document> chunks = splitter.apply(pages);

                    String filename = resource.getFilename() != null ? resource.getFilename().toLowerCase() : "";
                    String category = "general";
                    if (filename.contains("electronics") || filename.contains("ax-204") || filename.contains("bx-900")) {
                        category = "electronics";
                    } else if (filename.contains("clothing")) {
                        category = "clothing";
                    }

                    for (Document chunk : chunks) {
                        chunk.getMetadata().put("category", category);
                        chunk.getMetadata().put("source", resource.getFilename());
                    }

                    allChunks.addAll(chunks);
                }
            }

            if (!allChunks.isEmpty()) {
                vectorStore.add(allChunks);
                System.out.println("Loaded " + allChunks.size() + " document chunks into vector store.");
            }
        } catch (Exception e) {
            System.err.println("Notice: Could not load knowledge base into vector store: " + e.getMessage());
        }
    }

    public String answerUserQuery(String question) {
        try {
            String conversationalResponse = handleConversationalQuery(question);
            if (conversationalResponse != null) {
                return conversationalResponse;
            }

            List<Document> relevantChunks = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query(question)
                            .topK(4)
                            .similarityThreshold(0.75)
                            .build()
            );

            // if (relevantChunks == null || relevantChunks.isEmpty()) {
            //     return "No relevant information found in the knowledge base.";
            // }

            StringBuilder context = new StringBuilder();
            for (Document document : relevantChunks) {
                if (document != null && document.getText() != null) {
                    context.append(document.getText()).append("\n\n");
                }
            }

            String finalContext = context.toString();

            String prompt = """
                    You are an AI customer support assistant for our e-commerce company.

                    Answer the customer politely using ONLY the company information provided below.
                    If the customer greeted you, greet them back warmly before answering.

                    If the answer is not available in the provided information, say:
                    "No relevant information found in the knowledge base."

                    COMPANY INFORMATION
                    %s
                    """.formatted(finalContext);

            String reply = chatClient.prompt()
                    .system(prompt)
                    .user(question)
                    .call()
                    .content();

            return reply != null ? reply : "No relevant information found in the knowledge base.";
        } catch (Exception e) {
            System.err.println("Error answering user query: " + e.getMessage());
            return "Sorry, I encountered an issue processing your request: " + e.getMessage();
        }
    }

    private String handleConversationalQuery(String question) {
        if (question == null || question.isBlank()) {
            return "Hello! How can I assist you with your ShopSphere orders, shipping, or policies today?";
        }

        String clean = question.trim().toLowerCase().replaceAll("[^a-zA-Z0-9\\s]", " ").replaceAll("\\s+", " ").trim();

        // Polite responses
        if (clean.matches("^(thanks|thank you|thank you so much|thanks a lot|thx|appreciate it)$")) {
            return "You're welcome! Let me know if you need help with anything else.";
        }

        if (clean.matches("^(bye|goodbye|see you|cya|have a good day|have a nice day|good night)$")) {
            return "Goodbye! Thank you for reaching out to ShopSphere Support. Have a great day!";
        }

        if (clean.matches("^(how are you|how are you doing|hows it going|how are things)$")) {
            return "I'm doing well, thank you! How can I help you today with your orders, returns, shipping, or policies?";
        }

        if (clean.matches("^(who are you|what are you|what can you do|how can you help me|help)$")) {
            return "I am ShopSphere's AI customer support assistant. You can ask me about returns, refunds, shipping times, order tracking, payment options, and store policies.";
        }

        // Pure greetings
        boolean startsWithGreeting = clean.matches("^(hi|hello|hey|hiya|howdy|hola|namaste|yo|greetings|good\\s*(morning|afternoon|evening|day))(\\s+.*)?$");
        if (startsWithGreeting) {
            boolean hasInquiryKeywords = clean.matches(".*\\b(return|refund|exchange|ship|shipping|delivery|deliver|track|tracking|order|orders|cancel|cancellation|payment|pay|paid|card|warranty|guarantee|policy|policies|fee|fees|cost|price|product|damaged|broken|international|address)\\b.*");
            if (!hasInquiryKeywords) {
                return "Hello! Welcome to ShopSphere Support. How can I assist you today with your orders, returns, shipping, or store policies?";
            }
        }

        return null;
    }
}
