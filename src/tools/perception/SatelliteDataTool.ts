import { SimpleNexusTool } from "@/tools/core/SimpleNexusTool";

export class SatelliteDataTool extends SimpleNexusTool {
  constructor() {
    super({
      id: "satellite-data",
      name: "Satellite Data Interpreter",
      description: "Interpreta sinais geoespaciais e imagens orbitais como proxy de atividade economica, clima e infraestrutura.",
      category: "perception",
      keywords: ["satellite", "geo", "geospatial", "image", "climate", "infrastructure", "traffic"],
      strategy: "geospatial-signal-extraction",
    });
  }
}
