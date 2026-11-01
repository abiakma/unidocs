import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/app-config.js";
import { MockStudentDataProvider } from "./providers/mock-student-data.provider.js";
import { PlatonusStudentDataProvider } from "./providers/platonus-student-data.provider.js";
import { STUDENT_DATA_PROVIDER, type StudentDataProvider } from "./student-data.types.js";
import { StudentsController } from "./students.controller.js";

@Global()
@Module({
  controllers: [StudentsController],
  providers: [
    {
      provide: STUDENT_DATA_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): StudentDataProvider =>
        config.studentDataProvider === "platonus"
          ? new PlatonusStudentDataProvider(config)
          : new MockStudentDataProvider(),
    },
  ],
  exports: [STUDENT_DATA_PROVIDER],
})
export class StudentsModule {}
