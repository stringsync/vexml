import { Source } from '../types';

export type WorkspaceProps = {
  sources: Source[];
  onSourcesChange: (sources: Source[]) => void;
};

export const Workspace = (props: WorkspaceProps) => {
  return <div>Workspace</div>;
};

export default Workspace;
