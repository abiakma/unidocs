import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module.js";
import { WorkflowModule } from "../workflow/workflow.module.js";
import { RequestsController } from "./requests.controller.js";
import { RequestsService } from "./requests.service.js";
import { StaffController } from "./staff.controller.js";

@Module({
  imports: [WorkflowModule, DocumentsModule],
  controllers: [RequestsController, StaffController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
