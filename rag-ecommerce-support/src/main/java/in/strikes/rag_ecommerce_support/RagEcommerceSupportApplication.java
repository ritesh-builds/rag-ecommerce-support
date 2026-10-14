package in.strikes.rag_ecommerce_support;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
public class RagEcommerceSupportApplication {

	public static void main(String[] args) {
		loadDotEnv();
		SpringApplication.run(RagEcommerceSupportApplication.class, args);
	}

	private static void loadDotEnv() {
		File[] possibleEnvFiles = new File[]{
				new File(".env"),
				new File("rag-ecommerce-support/.env"),
				new File("../.env")
		};

		for (File envFile : possibleEnvFiles) {
			if (envFile.exists() && envFile.isFile()) {
				try {
					List<String> lines = Files.readAllLines(envFile.toPath());
					for (String line : lines) {
						String trimmed = line.trim();
						if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
							continue;
						}
						int eqIdx = trimmed.indexOf('=');
						String key = trimmed.substring(0, eqIdx).trim();
						String value = trimmed.substring(eqIdx + 1).trim();
						if ((value.startsWith("\"") && value.endsWith("\"")) ||
							(value.startsWith("'") && value.endsWith("'"))) {
							value = value.substring(1, value.length() - 1);
						}
						if (System.getProperty(key) == null && System.getenv(key) == null) {
							System.setProperty(key, value);
						}
					}
					System.out.println("Loaded environment variables from " + envFile.getAbsolutePath());
					break;
				} catch (Exception e) {
					System.err.println("Failed to read .env file: " + e.getMessage());
				}
			}
		}
	}

}
