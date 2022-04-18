import { Statistic } from 'antd';
import pixelmatch from 'pixelmatch';
import React, { useEffect, useId, useState } from 'react';

type ImageDataFactory = () => Promise<ImageData | null>;

export type DiffProps = {
  src1: ImageDataFactory;
  src2: ImageDataFactory;
};

export const Diff: React.FC<DiffProps> = (props) => {
  const { src1, src2 } = props;
  const id = useId();

  const [imgData1, setImgData1] = useState<ImageData | null>(null);
  useEffect(() => {
    src1().then(setImgData1).catch();
  }, [src1]);

  const [imgData2, setImgData2] = useState<ImageData | null>(null);
  useEffect(() => {
    src2().then(setImgData2).catch();
  }, [src2]);

  const [diffResult, setDiffResult] = useState<number | null>(null);
  useEffect(() => {
    if (!imgData1) {
      return;
    }
    if (!imgData2) {
      return;
    }
    const width = imgData1.width;
    const height = imgData1.height;

    const canvas = document.getElementById(id)! as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    const diff = ctx.createImageData(width, height);
    const numMismatchPixels = pixelmatch(imgData1.data, imgData2.data, diff.data, width, height);

    const numPixels = width * height;
    const diffResult = ((numPixels - numMismatchPixels) / numPixels) * 100;
    setDiffResult(diffResult);

    ctx.putImageData(diff, 0, 0);
  }, [id, imgData1, imgData2]);

  return (
    <>
      {typeof diffResult === 'number' && <Statistic title="match" value={diffResult} suffix="%" precision={1} />}
      {imgData1 && imgData2 && <canvas id={id} />}
    </>
  );
};
