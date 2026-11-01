import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AUTH_PROVIDER, type AuthProvider } from "./providers/auth-provider.types.js";
import { MockAuthProvider } from "./providers/mock-auth.provider.js";
import { PlatonusSsoProvider } from "./providers/platonus-sso.provider.js";
import { SessionService } from "./session.service.js";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    {
      provide: AUTH_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): AuthProvider =>
        config.authProvider === "platonus"
          ? new PlatonusSsoProvider(config.platonus)
          : new MockAuthProvider(config.webBaseUrl),
    },
  ],
  exports: [SessionService],
})
export class AuthModule {}
