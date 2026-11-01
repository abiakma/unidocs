import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module.js";
import { RequestsModule } from "../requests/requests.module.js";
import { WorkflowModule } from "../workflow/workflow.module.js";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({
  imports: [WorkflowModule, RequestsModule, DocumentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
