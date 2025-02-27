import { VEXML_VERSION } from '../constants';

export const Title = () => {
  return (
    <div className="container-fluid py-5">
      <h1 className="display-4">vexml {VEXML_VERSION}</h1>
      <p className="fs-4">A MusicXML rendering library</p>

      <a href="https://github.com/stringsync/vexml" target="_blank" rel="noreferrer">
        <img src="https://img.shields.io/github/stars/stringsync/vexml?style=social" alt="GitHub stars" />
      </a>
    </div>
  );
};
