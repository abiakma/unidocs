import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";
import { MockSigningProvider } from "./mock-signing.provider.js";
import { OfficialSigningProvider } from "./official-signing.provider.js";
import { SIGNING_PROVIDERS, type SigningProviders } from "./signing-provider.types.js";

@Global()
@Module({
  providers: [
    {
      provide: SIGNING_PROVIDERS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): SigningProviders => {
        const all = [new MockSigningProvider(), new OfficialSigningProvider()];
        const active = config.signingProvider === "official" ? all[1]! : all[0]!;
        return {
          active,
          // Existing signatures are always checked by the provider that created them.
          byName: (name) => all.find((provider) => provider.name === name) ?? null,
        };
      },
    },
  ],
  exports: [SIGNING_PROVIDERS],
})
export class SigningModule {}
