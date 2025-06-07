// ===== 3. 구체적인 Executor 구현 =====
// TriggerNodeExecutor.ts

import { TriggerNodeData } from "@/common/types/workflow";
import { BaseNodeExecutor } from "./BaseNodeExecutor";
import { ExecutePayload, ExecuteResult } from "./node-executor-types";

// TriggerNodeExecutor.ts
export class TriggerNodeExecutor extends BaseNodeExecutor<TriggerNodeData> {
    protected async doExecute(payload: ExecutePayload): Promise<Partial<ExecuteResult>> {
      this.logger.info(`🚀 Workflow triggered: ${payload.triggerId}`);
      
      return {
        data: {
          started: true,
          triggerType: 'manual', // config가 없으므로 하드코딩
          label: this.node.label,
          nodeId: this.node.id
        }
      };
    }
  }