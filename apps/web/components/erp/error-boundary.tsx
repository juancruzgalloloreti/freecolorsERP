'use client'

import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <span className="text-red-600 text-2xl">!</span>
        </div>
        <h2 className="text-lg font-semibold mb-2">Ocurrió un error en el mostrador</h2>
        <p className="text-muted mb-4">
          {this.state.error?.message || 'Error inesperado'}
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={this.handleReset}>
            Reintentar
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      </div>
    )
  }
}
