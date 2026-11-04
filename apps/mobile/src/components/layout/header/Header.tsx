import { Image } from "react-native";
export function BrandHeader({white = false}: {white?: boolean}) {
  return <Image accessibilityLabel="Quick Pay" source={white ? require("../../../../assets/brand/header-dark.png") : require("../../../../assets/brand/header-light.png")} resizeMode="contain" className="h-9 w-36" />;
}
