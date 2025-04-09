'use client';

import { Modal } from 'react-bootstrap'; // Only Modal is needed from react-bootstrap
// Import component-specific CSS module
import styles from '@/styles/ConfirmationModal.module.css';

interface ConfirmationModalProps {
  show: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'secondary'; // Variant determines confirm button style
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger' // Default confirm button to danger style
}) => {

  // Helper function to get the correct CSS module class for the confirm button
  const getConfirmButtonClass = () => {
    if (variant === 'danger') return styles.modalButtonDanger;
    // Use primary style for 'primary' or 'secondary' variant prop
    return styles.modalButton;
  };

  return (
    <Modal
      show={show}
      onHide={onCancel}
      // Apply the specific class from this component's CSS module
      className={styles.confirmationModal}
      centered
      backdrop="static"
      // --- ADDED: Disable default react-bootstrap animation ---
      animation={false}
      // -------------------------------------------------------
    >
      <Modal.Header closeButton>
        {/* Title uses styles inherited via .confirmationModal scope */}
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Body uses styles inherited via .confirmationModal scope */}
        {message}
      </Modal.Body>
      <Modal.Footer>
        {/* Use regular <button> elements with CSS module classes */}
        <button type="button" className={styles.modalButton} onClick={onCancel}>
          {cancelText}
        </button>
        <button type="button" className={getConfirmButtonClass()} onClick={onConfirm}>
          {confirmText}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmationModal;
