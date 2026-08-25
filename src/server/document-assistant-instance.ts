import { DocumentAssistantService } from "@/server/document-assistant";
import { documentIntakeRepository } from "@/server/repositories/document-intake-repository";
import { journeyRepository } from "@/server/repositories/journey-repository";

export const documentAssistant = new DocumentAssistantService(journeyRepository, documentIntakeRepository);
