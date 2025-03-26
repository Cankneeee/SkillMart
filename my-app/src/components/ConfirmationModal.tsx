'use client';

import { Modal, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import styles from '@/styles/Modal.module.css';

interface ConfirmationModalProps {
  show: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'secondary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) => {
  const router = useRouter();

  // Function to determine which button class to use based on variant
  const getButtonClass = () => {
    if (variant === 'danger') return styles.modalButtonDanger;
    if (variant === 'secondary') return styles.modalButtonSecondary;
    return styles.modalButton;
  };

  return (
    <div className={styles.customModal}>
      <Modal 
        show={show} 
        onHide={onCancel}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message}
        </Modal.Body>
        <Modal.Footer>
          <button 
            className={styles.modalButtonSecondary} 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={getButtonClass()} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ConfirmationModal;