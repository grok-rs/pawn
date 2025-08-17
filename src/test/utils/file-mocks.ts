import { vi } from 'vitest';

/**
 * Creates a ProgressEvent with proper typing for FileReader
 */
const createFileReaderProgressEvent = (
  type: string
): ProgressEvent<FileReader> => {
  // Create a proper ProgressEvent for FileReader by using Object.create to set the correct prototype
  const event = Object.create(ProgressEvent.prototype);
  event.type = type;
  event.target = Object.create(FileReader.prototype);
  event.currentTarget = event.target;
  event.eventPhase = Event.AT_TARGET;
  event.bubbles = false;
  event.cancelable = false;
  event.defaultPrevented = false;
  event.composed = false;
  event.isTrusted = false;
  event.timeStamp = Date.now();
  return event;
};

/**
 * Creates a mock File object with proper defaults
 */
export interface MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice(start?: number, end?: number, contentType?: string): Blob;
  stream(): ReadableStream<Uint8Array>;
  text(): Promise<string>;
}

export const createMockFile = (
  content: string,
  filename: string,
  type = 'text/csv'
): MockFile => ({
  name: filename,
  size: content.length,
  type,
  lastModified: Date.now(),
  webkitRelativePath: '',
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(content.length)),
  slice: (start?: number, end?: number, contentType?: string) =>
    new Blob([content.slice(start, end)], { type: contentType || type }),
  stream: () => new ReadableStream(),
  text: () => Promise.resolve(content),
});

/**
 * Export the ProgressEvent helper for use in other test files
 */
export { createFileReaderProgressEvent };

/**
 * Creates a complete mock FileReader class that properly implements the FileReader interface
 */
export class MockFileReader implements FileReader {
  // Standard FileReader properties
  error: DOMException | null = null;
  readyState: 0 | 1 | 2 = FileReader.EMPTY;
  result: string | ArrayBuffer | null = null;

  // Event handlers
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null =
    null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null =
    null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null =
    null;
  onloadend:
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
    | null = null;
  onloadstart:
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
    | null = null;
  onprogress:
    | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
    | null = null;

  // Constants
  readonly EMPTY = 0;
  readonly LOADING = 1;
  readonly DONE = 2;

  // Mock functions for testing
  private mockResult = '';
  private mockError: DOMException | null = null;

  // Methods
  abort(): void {
    this.readyState = FileReader.DONE;
    const event = createFileReaderProgressEvent('abort');
    if (this.onabort) {
      this.onabort.call(this, event);
    }
  }

  readAsArrayBuffer(__file: Blob): void {
    this.readyState = FileReader.LOADING;

    // Simulate async operation
    setTimeout(() => {
      this.readyState = FileReader.DONE;
      this.result = new ArrayBuffer(0);
      const event = createFileReaderProgressEvent('load');
      if (this.onload) {
        this.onload.call(this, event);
      }
    }, 0);
  }

  readAsBinaryString(_file: Blob): void {
    this.readyState = FileReader.LOADING;

    setTimeout(() => {
      this.readyState = FileReader.DONE;
      this.result = this.mockResult;
      const event = createFileReaderProgressEvent('load');
      if (this.onload) {
        this.onload.call(this, event);
      }
    }, 0);
  }

  readAsDataURL(_file: Blob): void {
    this.readyState = FileReader.LOADING;

    setTimeout(() => {
      this.readyState = FileReader.DONE;
      const fileType =
        'type' in _file ? _file.type : 'application/octet-stream';
      this.result = `data:${fileType};base64,${btoa(this.mockResult)}`;
      const event = createFileReaderProgressEvent('load');
      if (this.onload) {
        this.onload.call(this, event);
      }
    }, 0);
  }

  readAsText(_file: Blob, _encoding?: string): void {
    this.readyState = FileReader.LOADING;

    if (this.onloadstart) {
      this.onloadstart.call(this, createFileReaderProgressEvent('loadstart'));
    }

    setTimeout(() => {
      this.readyState = FileReader.DONE;

      if (this.mockError) {
        this.error = this.mockError;
        const errorEvent = createFileReaderProgressEvent('error');
        if (this.onerror) {
          this.onerror.call(this, errorEvent);
        }
      } else {
        this.result = this.mockResult;
        const loadEvent = createFileReaderProgressEvent('load');
        if (this.onload) {
          this.onload.call(this, loadEvent);
        }
      }

      if (this.onloadend) {
        this.onloadend.call(this, createFileReaderProgressEvent('loadend'));
      }
    }, 0);
  }

  // EventTarget methods
  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject | null,
    _options?: boolean | AddEventListenerOptions
  ): void {
    // Mock implementation - not used in current tests
  }

  removeEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject | null,
    _options?: boolean | EventListenerOptions
  ): void {
    // Mock implementation - not used in current tests
  }

  dispatchEvent(_event: Event): boolean {
    // Mock implementation - not used in current tests
    return true;
  }

  // Test helper methods
  setMockResult(result: string): void {
    this.mockResult = result;
  }

  setMockError(error: DOMException | null): void {
    this.mockError = error;
  }
}

/**
 * Creates a factory function for MockFileReader instances
 */
export const createMockFileReader = (): MockFileReader => new MockFileReader();

/**
 * Sets up global FileReader mock for tests
 */
export const setupFileReaderMock = (): MockFileReader => {
  const mockFileReader = createMockFileReader();

  Object.defineProperty(globalThis, 'FileReader', {
    writable: true,
    value: vi.fn(() => mockFileReader),
  });

  return mockFileReader;
};
