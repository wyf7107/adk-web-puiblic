import { ExecutableCode, CodeExecutionResult, FunctionCall, FunctionResponse } from './types';
import { MediaType } from '../../components/artifact-tab/artifact-tab.component';

export interface UiEvent {
  role: 'user' | 'bot' | string;
  eventId?: string;
  text?: string;
  thought?: boolean;
  isLoading?: boolean;
  isLanding?: boolean;
  isEditing?: boolean;
  evalStatus?: number;
  failedMetric?: boolean;
  attachments?: { file: File; url: string }[];
  renderedContent?: any;
  a2uiData?: any;
  executableCode?: ExecutableCode;
  codeExecutionResult?: CodeExecutionResult;
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
}
