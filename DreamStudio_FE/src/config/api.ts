import Config from "react-native-config";

if (!Config.API_BASE_URL) {
  throw new Error("Missing API_BASE_URL");
}

export const API_BASE_URL = Config.API_BASE_URL;
