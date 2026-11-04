import { router } from "expo-router";
import { Screen } from "../src/components/layout/screen";
import { Notice } from "../src/components/feedback/Feedback";
import { Button } from "../src/components/ui/button";
export default function NotFound() {
  return (
    <Screen title="Let’s get you back.">
      <Notice>
        This link is not available. Open your account to continue.
      </Notice>
      <Button title="Open Quick Pay" onPress={() => router.replace("/")} />
    </Screen>
  );
}
