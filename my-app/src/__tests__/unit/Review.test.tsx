import { render, screen, fireEvent } from '@testing-library/react';
import Review from '@/components/Review';

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaUser: () => <div data-testid="fa-user" />,
  FaStar: () => <div data-testid="fa-star" />,
  FaPen: () => <div data-testid="edit-icon" />,
  FaTrash: () => <div data-testid="delete-icon" />,
  FaCheck: () => <div data-testid="save-icon" />,
  FaTimes: () => <div data-testid="cancel-icon" />,
}));

// Mock ConfirmationModal component
jest.mock('@/components/ConfirmationModal', () => {
  return function MockConfirmationModal({ 
    show, 
    title, 
    message, 
    onCancel, 
    onConfirm, 
    confirmText, 
    cancelText 
  }: any) {
    return show ? (
      <div data-testid="confirmation-modal">
        <div>{title}</div>
        <div>{message}</div>
        <button onClick={onCancel}>{cancelText}</button>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null;
  };
});

// Mock CSS modules
jest.mock('@/styles/Review.module.css', () => ({
  reviewCard: 'mock-review-card',
  reviewTitle: 'mock-review-title',
  reviewText: 'mock-review-text',
  reviewScore: 'mock-review-score',
  reviewActions: 'mock-review-actions',
  actionButton: 'mock-action-button',
  ratingStars: 'mock-rating-stars',
  editableStar: 'mock-editable-star',
  reviewTextField: 'mock-review-text-field',
}));

describe('Review Component', () => {
  // Sample review data for testing
  const mockReview = {
    id: '123',
    username: 'Test User',
    rating: 4,
    text: 'This is a test review',
    profilePic: 'https://example.com/profile.jpg',
    user_id: 'user123',
    isEditing: false,
  };
  
  // Mock handler functions
  const mockOnEditToggle = jest.fn();
  const mockOnUpdateReview = jest.fn();
  const mockOnDeleteReview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders review with correct content', () => {
    render(
      <Review 
        review={mockReview} 
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Check username is displayed
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Check review text is displayed
    expect(screen.getByText('This is a test review')).toBeInTheDocument();
    
    // Check rating display - should have 4 gold stars and 1 gray star
    const stars = screen.getAllByTestId('fa-star');
    expect(stars.length).toBe(5);
    
    // Check score text
    expect(screen.getByText('4/5')).toBeInTheDocument();
  });

  test('shows action buttons when user is the author', () => {
    render(
      <Review 
        review={mockReview} 
        currentUserId="user123" // Same as review.user_id
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Should see edit and delete buttons
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
    expect(screen.getByTestId('delete-icon')).toBeInTheDocument();
  });

  test('hides action buttons when user is not the author', () => {
    render(
      <Review 
        review={mockReview} 
        currentUserId="differentUser" // Different from review.user_id
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Should not see edit and delete buttons
    expect(screen.queryByTestId('edit-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-icon')).not.toBeInTheDocument();
  });

  test('entering edit mode when edit button is clicked', () => {
    render(
      <Review 
        review={mockReview} 
        currentUserId="user123"
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Find the edit button (container of the edit icon) and click it
    const editButton = screen.getByTestId('edit-icon').closest('button');
    if (editButton) fireEvent.click(editButton);
    
    // onEditToggle should be called with id and true
    expect(mockOnEditToggle).toHaveBeenCalledWith('123', true);
  });

  test('shows confirmation dialog when delete button is clicked', () => {
    render(
      <Review 
        review={mockReview} 
        currentUserId="user123"
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Find the delete button and click it
    const deleteButton = screen.getByTestId('delete-icon').closest('button');
    if (deleteButton) fireEvent.click(deleteButton);
    
    // Confirmation modal should be shown
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
  });

  test('deletes review when confirmed in dialog', () => {
    render(
      <Review 
        review={mockReview} 
        currentUserId="user123"
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Find the delete button and click it
    const deleteButton = screen.getByTestId('delete-icon').closest('button');
    if (deleteButton) fireEvent.click(deleteButton);
    
    // Find the confirm button in the modal and click it
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);
    
    // onDeleteReview should be called with the review id
    expect(mockOnDeleteReview).toHaveBeenCalledWith('123');
  });

  test('renders edit form when in editing mode', () => {
    const editingReview = {
      ...mockReview,
      isEditing: true,
    };
    
    render(
      <Review 
        review={editingReview} 
        currentUserId="user123"
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Should see the textarea for editing
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('This is a test review');
    
    // Should see save and cancel buttons
    expect(screen.getByTestId('save-icon')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-icon')).toBeInTheDocument();
  });

  test('updates review when save button is clicked', () => {
    const editingReview = {
      ...mockReview,
      isEditing: true,
    };
    
    render(
      <Review 
        review={editingReview} 
        currentUserId="user123"
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Change the textarea value
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated review text' } });
    
    // Click the save button
    const saveButton = screen.getByTestId('save-icon').closest('button');
    if (saveButton) fireEvent.click(saveButton);
    
    // onUpdateReview should be called with the id, new text, and rating
    expect(mockOnUpdateReview).toHaveBeenCalledWith('123', 'Updated review text', 4);
  });

  test('cancels editing when cancel button is clicked', () => {
    const editingReview = {
      ...mockReview,
      isEditing: true,
    };
    
    render(
      <Review 
        review={editingReview} 
        currentUserId="user123"
        onEditToggle={mockOnEditToggle} 
        onUpdateReview={mockOnUpdateReview} 
        onDeleteReview={mockOnDeleteReview} 
      />
    );
    
    // Click the cancel button
    const cancelButton = screen.getByTestId('cancel-icon').closest('button');
    if (cancelButton) fireEvent.click(cancelButton);
    
    // onEditToggle should be called with id and false
    expect(mockOnEditToggle).toHaveBeenCalledWith('123', false);
  });
});