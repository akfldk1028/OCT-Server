// ===== 4. Service Node Executor =====
// ServiceNodeExecutor.ts

import { ServiceNodeData } from "@/common/types/workflow";
import { BaseNodeExecutor } from "./BaseNodeExecutor";
import { ExecutePayload, ExecuteResult } from "./node-executor-types";

export class ServiceNodeExecutor extends BaseNodeExecutor<ServiceNodeData> {
    protected async doExecute(payload: ExecutePayload): Promise<Partial<ExecuteResult>> {
      const { context } = payload;
      
      const serviceConfig = (this.node as any)?.data?.config || {};
      
      this.logger.info(`Service: ${serviceConfig.name}`);
      
      const result = {
        data: {
          service: serviceConfig,
          node: {
            id: this.node.id,
            type: this.node.type,
            config: serviceConfig
          }
        }
      };
      
      context.set(String(this.node.id), result);
      return result;
    }
  }