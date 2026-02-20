import type { ReactNode } from 'react'

type PageFrameProps = {
  title: string
  subtitle: string
  rightLabel?: string
  children: ReactNode
}

export function PageFrame(props: PageFrameProps): JSX.Element {
  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="topbar-title">{props.title}</h1>
          <p>{props.subtitle}</p>
        </div>
        {props.rightLabel ? <span className="pill mono">{props.rightLabel}</span> : null}
      </header>
      {props.children}
    </>
  )
}
