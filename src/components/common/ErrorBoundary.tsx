import { Component, type ErrorInfo, type ReactNode } from "react";
import { Trans } from "react-i18next";
import i18n from "../../i18n";

interface Props {
  /** Nombre del módulo, para el mensaje y el registro local. */
  name: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Límite de error por módulo (OWASP A10 «Condiciones excepcionales»): si un módulo falla,
 * el resto de la app sigue funcionando y el modo emergencia queda siempre a un toque.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Solo consola local: sin telemetría externa.
    console.error(`[aegis] fallo en el módulo «${this.props.name}»`, error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="module-error" role="alert">
        <p className="module-error__title">{i18n.t("errors.title", { name: this.props.name })}</p>
        <p>
          <Trans i18nKey="errors.body" components={{ a: <a href="/emergencia" /> }} />
        </p>
        <button type="button" className="mbtn mbtn--ghost" onClick={() => this.setState({ failed: false })}>
          {i18n.t("errors.retry")}
        </button>
      </div>
    );
  }
}
