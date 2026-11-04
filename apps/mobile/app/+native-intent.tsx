import Constants from "expo-constants";
import { parseAppLink, linkRoute } from "../src/services/deep-links/validate";
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  const link = parseAppLink(path, Constants.expoConfig?.extra?.linkHost);
  return link ? linkRoute(link) : "/";
}
