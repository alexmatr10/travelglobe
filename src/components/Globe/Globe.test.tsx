import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Globe from './Globe'

describe('Globe', () => {
  it('renders a map container with data-testid="globe-container"', () => {
    render(<Globe />)
    const container = screen.getByTestId('globe-container')
    expect(container).toBeInTheDocument()
  })
})
