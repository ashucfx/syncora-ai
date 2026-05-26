export { gatewayComplete, gatewayEmbed, CAPABILITY_ROUTES } from "./gateway.js";
export type { GatewayRequest, GatewayResponse } from "./gateway.js";
export {
  embedAndStore,
  retrieveContext,
  formatContextForPrompt,
} from "./memory/retriever.js";
export type { ContextChunk } from "./memory/retriever.js";
export {
  summarizeProjectPrompt,
  draftClientEmailPrompt,
  triageInquiryPrompt,
  generateTaskDescriptionPrompt,
} from "./prompts/index.js";
