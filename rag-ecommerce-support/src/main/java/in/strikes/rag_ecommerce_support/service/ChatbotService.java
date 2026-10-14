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
            List<Document> relevantChunks = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query(question)
                            .topK(4)
                            .build()
            );

            StringBuilder context = new StringBuilder();
            if (relevantChunks != null) {
                for (Document document : relevantChunks) {
                    if (document != null && document.getText() != null) {
                        context.append(document.getText()).append("\n\n");
                    }
                }
            }

            String finalContext = context.toString();

            String prompt = """
                    You are an AI customer support assistant for our e-commerce company.

                    Answer the customer using ONLY the company information provided below.

                    If the answer is not available in the provided information, say:
                    "I don't have that information in the company documents."

                    COMPANY INFORMATION
                    %s
                    """.formatted(finalContext);

            String reply = chatClient.prompt()
                    .system(prompt)
                    .user(question)
                    .call()
                    .content();

            return reply != null ? reply : "I don't have that information in the company documents.";
        } catch (Exception e) {
            System.err.println("Error answering user query: " + e.getMessage());
            return "Sorry, I encountered an issue processing your request: " + e.getMessage();
        }
    }
}
