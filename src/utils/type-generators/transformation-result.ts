import { UntypedRequest } from './untyped-request';

// Global pipe returns it's input if parsed variable wasn't of type which pipe parses or parsed result otherwise.
export type TransformationResult<T> = UntypedRequest<T> | T;
