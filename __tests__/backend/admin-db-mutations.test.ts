import { describe, it, expect } from "vitest";
import {
  mutateVocabulary,
  batchMutateVocabulary,
  deleteVocabularyItem,
  mutateGrammarTopic,
  deleteGrammarTopicItem,
  mutateGoetheMaterial,
  deleteGoetheMaterialItem,
  mutateVocabularyCategory,
  deleteVocabularyCategory,
  getVocabulary,
  getGrammarTopics,
} from "@/lib/db/content";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Admin Backend - Database Mutations & Strict UUID Standard", () => {
  describe("Vocabulary Mutations", () => {
    it("should assign a valid UUIDv4 and slug when creating a vocabulary item", async () => {
      const item = await mutateVocabulary({
        level: "A1",
        category: "Greetings",
        german_content: "Hallo Test",
        english_meaning: "Hello Test",
        malayalam_meaning: "ഹലോ ടെസ്റ്റ്",
      });

      expect(item.id).toBeDefined();
      expect(item.id).toMatch(UUID_REGEX);
      expect(item.slug).toBe("hallo-test-a1");
      expect(item.german_content).toBe("Hallo Test");
    });

    it("should maintain existing UUID and update content on vocabulary edit", async () => {
      const existingId = crypto.randomUUID();
      const updated = await mutateVocabulary({
        id: existingId,
        level: "A1",
        category: "Greetings",
        german_content: "Guten Abend",
        english_meaning: "Good evening",
        malayalam_meaning: "ശുഭസായാഹ്നം",
      });

      expect(updated.id).toBe(existingId);
      expect(updated.german_content).toBe("Guten Abend");
    });

    it("should assign valid UUIDs to every item during batch vocabulary mutation", async () => {
      const batch = await batchMutateVocabulary([
        {
          level: "A2",
          category: "Shopping & Groceries",
          german_content: "Supermarkt",
          english_meaning: "Supermarket",
          malayalam_meaning: "സൂപ്പർമാർക്കറ്റ്",
        },
        {
          level: "A2",
          category: "Shopping & Groceries",
          german_content: "Bäckerei",
          english_meaning: "Bakery",
          malayalam_meaning: "ബേക്കറി",
        },
      ]);

      expect(batch.length).toBe(2);
      batch.forEach((item, idx) => {
        expect(item.id).toMatch(UUID_REGEX);
        expect(item.order_index).toBe(idx + 1);
        expect(item.slug).toBeDefined();
      });
    });

    it("should delete vocabulary item successfully", async () => {
      const item = await mutateVocabulary({
        level: "B1",
        category: "Work & Career",
        german_content: "Delete Me",
        english_meaning: "Delete Me",
        malayalam_meaning: "ഡിലീറ്റ്",
      });

      const deleted = await deleteVocabularyItem(item.id);
      expect(deleted).toBe(true);

      const remaining = await getVocabulary("B1", "Work & Career");
      expect(remaining.find((w) => w.id === item.id)).toBeUndefined();
    });
  });

  describe("Grammar Topic Mutations", () => {
    it("should assign a valid UUID and generate clean slug on grammar topic creation", async () => {
      const topic = await mutateGrammarTopic({
        title: "Akkusativ und Dativ Präpositionen",
        level: "A2",
        short_description: "Prepositions that take accusative or dative",
      });

      expect(topic.id).toMatch(UUID_REGEX);
      expect(topic.slug).toBe("akkusativ-und-dativ-pr-positionen");
      expect(topic.title).toBe("Akkusativ und Dativ Präpositionen");
    });

    it("should delete grammar topic successfully", async () => {
      const topic = await mutateGrammarTopic({
        title: "Temporary Topic To Delete",
        level: "B2",
      });

      const deleted = await deleteGrammarTopicItem(topic.id);
      expect(deleted).toBe(true);

      const all = await getGrammarTopics("B2");
      expect(all.find((t) => t.id === topic.id)).toBeUndefined();
    });
  });

  describe("Goethe Material Mutations", () => {
    it("should assign a valid UUID on Goethe material creation", async () => {
      const material = await mutateGoetheMaterial({
        title: "Goethe B1 Hören Teil 1",
        level: "B1",
        section: "Hören",
        description: "Listening comprehension part 1",
        content: "Audio dialogues and questions...",
      });

      expect(material.id).toMatch(UUID_REGEX);
      expect(material.section).toBe("Hören");
    });

    it("should delete Goethe material successfully", async () => {
      const material = await mutateGoetheMaterial({
        title: "Goethe To Delete",
        level: "A1",
        section: "Lesen",
      });

      const deleted = await deleteGoetheMaterialItem(material.id);
      expect(deleted).toBe(true);
    });
  });

  describe("Category Mutations", () => {
    it("should assign a valid UUIDv4 when creating a new category without ID", async () => {
      const category = await mutateVocabularyCategory({
        name: "Sports & Hobbies",
        order_index: 12,
      });

      expect(category.id).toBeDefined();
      expect(category.id).toMatch(UUID_REGEX);
      expect(category.name).toBe("Sports & Hobbies");
      expect(category.order_index).toBe(12);
    });

    it("should maintain existing UUID and update properties when editing an existing category", async () => {
      const existingId = crypto.randomUUID();
      const updated = await mutateVocabularyCategory({
        id: existingId,
        name: "Sports Updated",
        order_index: 15,
      });

      expect(updated.id).toBe(existingId);
      expect(updated.name).toBe("Sports Updated");
      expect(updated.order_index).toBe(15);
    });

    it("should delete category successfully", async () => {
      const category = await mutateVocabularyCategory({
        name: "Temporary Category",
        order_index: 99,
      });

      const deleted = await deleteVocabularyCategory(category.id);
      expect(deleted).toBe(true);
    });

    it("should cascade category rename to vocabulary words under that category", async () => {
      const cat = await mutateVocabularyCategory({
        name: "Old Category Name",
        order_index: 20,
      });

      const word = await mutateVocabulary({
        level: "A1",
        category: "Old Category Name",
        german_content: "Kaskade",
        english_meaning: "Cascade",
        malayalam_meaning: "കസ്കേഡ്",
      });

      expect(word.category).toBe("Old Category Name");

      // Rename category
      await mutateVocabularyCategory({
        id: cat.id,
        name: "New Renamed Category",
        order_index: 20,
      });

      const allWords = await getVocabulary("A1");
      const updatedWord = allWords.find((w) => w.id === word.id);
      expect(updatedWord?.category).toBe("New Renamed Category");
    });
  });
});
