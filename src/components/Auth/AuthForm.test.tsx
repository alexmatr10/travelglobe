import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AuthForm from './AuthForm'

const signUpMock = jest.fn()
const signInMock = jest.fn()
const pushMock = jest.fn()
const refreshMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: pushMock,
    refresh: refreshMock,
  })),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInMock,
    },
  })),
}))

describe('AuthForm', () => {
  beforeEach(() => {
    signUpMock.mockReset()
    signInMock.mockReset()
    pushMock.mockReset()
    refreshMock.mockReset()
  })

  it('renders sign in mode by default', () => {
    render(<AuthForm />)
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument()
  })

  it('toggles to sign up mode and shows username field', () => {
    render(<AuthForm />)
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }))
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up$/i })).toBeInTheDocument()
  })

  it('submits sign in with email and password and redirects on success', async () => {
    signInMock.mockResolvedValueOnce({ data: { user: { id: 'u1' }, session: { access_token: 't' } }, error: null })
    render(<AuthForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }))
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' })
      expect(pushMock).toHaveBeenCalledWith('/')
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('submits sign up with email, password, and username, then redirects on success', async () => {
    signUpMock.mockResolvedValueOnce({ data: { user: { id: 'u2' }, session: { access_token: 't' } }, error: null })
    render(<AuthForm />)
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'traveler' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up$/i }))
    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: { data: { username: 'traveler' } },
      })
      expect(pushMock).toHaveBeenCalledWith('/')
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('disables submit button while loading', async () => {
    signInMock.mockImplementation(() => new Promise(() => {}))
    render(<AuthForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('displays an error message when auth fails', async () => {
    signInMock.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: 'Invalid credentials' } })
    render(<AuthForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
