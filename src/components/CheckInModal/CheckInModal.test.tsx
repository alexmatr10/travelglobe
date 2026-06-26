import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CheckInModal } from './CheckInModal'

const mockOnSubmit = jest.fn().mockResolvedValue(undefined)
const mockOnClose = jest.fn()

describe('CheckInModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the location and form fields', () => {
    render(<CheckInModal lat={40.7} lng={-74} onSubmit={mockOnSubmit} onClose={mockOnClose} />)

    expect(screen.getByText(/40.7000, -74.0000/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/where are you/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument()
  })

  it('submits placeName and note on form submit', async () => {
    render(<CheckInModal lat={40.7} lng={-74} onSubmit={mockOnSubmit} onClose={mockOnClose} />)

    fireEvent.change(screen.getByPlaceholderText(/where are you/i), {
      target: { value: 'NYC' },
    })
    fireEvent.change(screen.getByPlaceholderText(/add a note/i), {
      target: { value: 'Hello' },
    })
    fireEvent.click(screen.getByRole('button', { name: /drop ping/i }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({ placeName: 'NYC', note: 'Hello' })
    })
  })

  it('calls onClose when cancel is clicked', () => {
    render(<CheckInModal lat={40.7} lng={-74} onSubmit={mockOnSubmit} onClose={mockOnClose} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('disables submit when place name is empty', () => {
    render(<CheckInModal lat={40.7} lng={-74} onSubmit={mockOnSubmit} onClose={mockOnClose} />)

    const submitButton = screen.getByRole('button', { name: /drop ping/i })
    expect(submitButton).toBeDisabled()
  })
})
