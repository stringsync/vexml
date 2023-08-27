export type VexmlStatus =
  | {
      type: 'init';
      exampleId: string;
    }
  | {
      type: 'rendering';
      exampleId: string;
    }
  | {
      type: 'success';
      exampleId: string;
      elapsedMs: number;
    }
  | {
      type: 'error';
      elapsedMs: number;
      exampleId: string;
      error: any;
    };

export type ExampleStatus =
  | {
      type: 'init';
      exampleId: string;
    }
  | {
      type: 'rendering';
      exampleId: string;
    }
  | {
      type: 'success';
      exampleId: string;
      elapsedMs: number;
    }
  | {
      type: 'error';
      error: any;
      exampleId: string;
      elapsedMs: number;
    };
