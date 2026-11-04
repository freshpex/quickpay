import { Image } from "react-native";
import headerLight from "../../../../assets/brand/header-light.png";
import headerDark from "../../../../assets/brand/header-dark.png";
export function BrandHeader({ white = false }: { white?: boolean }) {
  return (
    <Image
      accessibilityLabel="Quick Pay"
      source={white ? headerDark : headerLight}
      resizeMode="contain"
      className="h-9 w-36"
    />
  );
}
