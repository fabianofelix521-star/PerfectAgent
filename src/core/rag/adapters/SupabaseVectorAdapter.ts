import { VectorStoreAdapter } from "@/core/rag/VectorStoreAdapter";

export class SupabaseVectorAdapter extends VectorStoreAdapter {
  readonly provider = "supabase";
}
