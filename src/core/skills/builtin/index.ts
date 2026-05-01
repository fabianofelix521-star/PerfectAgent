import type { Skill } from "@/core/skills/types";
import { WebScrapingSkill } from "@/core/skills/builtin/WebScrapingSkill";
import { DataAnalysisSkill } from "@/core/skills/builtin/DataAnalysisSkill";
import { EmailSkill } from "@/core/skills/builtin/EmailSkill";
import { CalendarSkill } from "@/core/skills/builtin/CalendarSkill";
import { CodeExecutionSkill } from "@/core/skills/builtin/CodeExecutionSkill";
import { ImageGenerationSkill } from "@/core/skills/builtin/ImageGenerationSkill";
import { DocumentSkill } from "@/core/skills/builtin/DocumentSkill";
import { SearchSkill } from "@/core/skills/builtin/SearchSkill";
import { APICallSkill } from "@/core/skills/builtin/APICallSkill";
import { DatabaseSkill } from "@/core/skills/builtin/DatabaseSkill";
import { NotificationSkill } from "@/core/skills/builtin/NotificationSkill";
import { FileManagementSkill } from "@/core/skills/builtin/FileManagementSkill";
import { GitSkill } from "@/core/skills/builtin/GitSkill";
import { TranslationSkill } from "@/core/skills/builtin/TranslationSkill";

export const BUILTIN_SKILLS: Skill[] = [
  WebScrapingSkill,
  DataAnalysisSkill,
  EmailSkill,
  CalendarSkill,
  CodeExecutionSkill,
  ImageGenerationSkill,
  DocumentSkill,
  SearchSkill,
  APICallSkill,
  DatabaseSkill,
  NotificationSkill,
  FileManagementSkill,
  GitSkill,
  TranslationSkill,
];
