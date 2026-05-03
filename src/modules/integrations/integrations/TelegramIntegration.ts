import { BaseIntegration } from "@/modules/integrations/integrations/BaseIntegration";

export const TELEGRAM_BOT_COMMANDS = [
  { command: "/runtime", description: "Troca o runtime ativo" },
  { command: "/provider", description: "Troca o provider ativo" },
  { command: "/model", description: "Troca o modelo ativo" },
  { command: "/voice", description: "Define modo de voz (on/off/tts/stt/realtime)" },
  { command: "/history", description: "Abre o histórico de conversas" },
  { command: "/help", description: "Lista comandos disponíveis" },
] as const;

export class TelegramIntegration extends BaseIntegration {
  readonly id = "telegram";
  readonly name = "Telegram";

  getSupportedCommands() {
    return TELEGRAM_BOT_COMMANDS;
  }
}
