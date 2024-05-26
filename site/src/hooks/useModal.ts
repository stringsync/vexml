import { Modal } from 'bootstrap';
import { RefObject, useEffect, useState } from 'react';

export const useModal = (ref: RefObject<Element>) => {
  const [modal, setModal] = useState<Modal>(() => new NoopModal());

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const modal = new Modal(element);
    setModal(modal);

    return () => {
      modal.dispose();
      setModal(new NoopModal());
    };
  }, [ref, setModal]);

  return modal;
};

class NoopModal implements Modal {
  dispose(): void {}
  handleUpdate(): void {}
  hide(): void {}
  show(): void {}
  toggle(): void {}
}
