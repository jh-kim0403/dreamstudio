declare module "react-native-config" {
  export interface NativeConfig {
    APP_ENV?: "dev" | "test" | "prod";
    API_BASE_URL?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
