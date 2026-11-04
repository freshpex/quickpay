import { env } from "../../../../shared/infrastructure/env";
export function pushConfigured() {return env().PUSH_ENABLED === "true" && !!env().EXPO_ACCESS_TOKEN?.trim();}
