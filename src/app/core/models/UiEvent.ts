import { ExecutableCode, CodeExecutionResult, FunctionCall, FunctionResponse, Event } from './types';
import { MediaType } from '../../components/artifact-tab/artifact-tab.component';

export class UiEvent {
  role!: 'user' | 'bot' | string;
  text?: string;
  thought?: boolean;
  isLoading?: boolean;
  isEditing?: boolean;
  evalStatus?: number;
  failedMetric?: boolean;
  attachments?: { file: File; url: string }[];
  renderedContent?: any;
  a2uiData?: any;
  executableCode?: ExecutableCode;
  codeExecutionResult?: CodeExecutionResult;
  event!: Event;
  inlineData?: {
    mediaType?: MediaType | string;
    data: string;
    name?: string;
    mimeType: string;
    displayName?: string;
  };
  functionCalls?: FunctionCall[];
  functionResponses?: FunctionResponse[];
  actualInvocationToolUses?: any;
  expectedInvocationToolUses?: any;
  actualFinalResponse?: string;
  expectedFinalResponse?: string;
  evalScore?: number;
  evalThreshold?: number;
  invocationIndex?: number;
  finalResponsePartIndex?: number;
  error?: {
    errorCode?: string;
    errorMessage?: string;
  };

  constructor(init?: Partial<UiEvent>) {
    Object.assign(this, init);
    
    // clean up empty objects in event.actions
    if (this.event?.actions) {
      for (const [key, value] of Object.entries(this.event.actions)) {
        if (value !== null && typeof value === 'object' && Object.keys(value).length === 0) {
          delete (this.event.actions as any)[key];
        }
      }
    }
  }

  get stateDelta(): any {
    return this.event?.actions?.stateDelta;
  }

  get artifactDelta(): any {
    return this.event?.actions?.artifactDelta;
  }

  get route(): any {
    return this.event?.actions?.route;
  }

  get nodePath(): string | null {
    return this.event?.nodeInfo?.path || null;
  }

  get author(): string {
    return this.event?.author ?? 'root_agent';
  }
}
