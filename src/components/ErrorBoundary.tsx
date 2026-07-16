import { Component, type ErrorInfo, type ReactNode } from 'react'
import { EmptyState } from './States'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Catches render/effect exceptions that would otherwise unmount the whole tree and leave a silent black screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado capturado pelo ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <EmptyState title="Algo deu errado" icon="campanhas">
          Ocorreu um erro inesperado ao carregar esta página. Tente recarregar; se persistir, avise o administrador.
        </EmptyState>
      )
    }
    return this.props.children
  }
}
