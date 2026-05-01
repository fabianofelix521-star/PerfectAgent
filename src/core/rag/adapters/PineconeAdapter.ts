import { VectorStoreAdapter } from "@/core/rag/VectorStoreAdapter";

export class PineconeAdapter extends VectorStoreAdapter {
  readonly provider = "pinecone";
}
