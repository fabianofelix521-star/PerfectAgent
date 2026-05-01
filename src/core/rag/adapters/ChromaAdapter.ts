import { VectorStoreAdapter } from "@/core/rag/VectorStoreAdapter";

export class ChromaAdapter extends VectorStoreAdapter {
  readonly provider = "chroma";
}
