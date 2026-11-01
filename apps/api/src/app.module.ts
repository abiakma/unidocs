import { Controller, Get, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { Public } from "./common/decorators.js";
import { CsrfGuard, RolesGuard, SessionGuard } from "./common/guards.js";
import { AppExceptionFilter } from "./common/prisma-exception.filter.js";
import { ConfigModule } from "./config/config.module.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { RequestsModule } from "./requests/requests.module.js";
import { SigningModule } from "./signing/signing.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { StudentsModule } from "./students/students.module.js";

@ApiTags("health")
@Controller("health")
class HealthController {
  @Get()
  @Public()
  health(): { status: "ok" } {
    return { status: "ok" };
  }
}

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    StorageModule,
    SigningModule,
    StudentsModule,
    AuthModule,
    DocumentsModule,
    RequestsModule,
    AdminModule,
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
  ],
  controllers: [HealthController],
  providers: [
    // Guards run in this order.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
})
export class AppModule {}
