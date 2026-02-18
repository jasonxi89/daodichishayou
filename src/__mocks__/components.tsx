// Mock for @tarojs/components - renders Taro components as plain HTML elements

import React from 'react'

export const View = ({
  children,
  className,
  onClick,
  style,
  ...props
}: React.PropsWithChildren<{
  className?: string
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties | string
  [key: string]: unknown
}>) => (
  <div className={className} onClick={onClick} style={style as React.CSSProperties} {...props}>
    {children}
  </div>
)

export const Text = ({
  children,
  className,
  onClick,
  style,
  ...props
}: React.PropsWithChildren<{
  className?: string
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties | string
  [key: string]: unknown
}>) => (
  <span className={className} onClick={onClick} style={style as React.CSSProperties} {...props}>
    {children}
  </span>
)

export const Input = ({
  value,
  onInput,
  onConfirm,
  placeholder,
  className,
  focus: _focus,
  ...props
}: {
  value?: string
  onInput?: (e: { detail: { value: string } }) => void
  onConfirm?: (e: { detail: { value: string } }) => void
  placeholder?: string
  className?: string
  focus?: boolean
  [key: string]: unknown
}) => (
  <input
    value={value ?? ''}
    onChange={(e) => onInput?.({ detail: { value: e.target.value } })}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        onConfirm?.({ detail: { value: (e.target as HTMLInputElement).value } })
      }
    }}
    placeholder={placeholder}
    className={className}
    {...props}
  />
)

export const Button = ({
  children,
  onClick,
  className,
  disabled,
  openType: _openType,
  ...props
}: React.PropsWithChildren<{
  onClick?: (e: React.MouseEvent) => void
  className?: string
  disabled?: boolean
  openType?: string
  [key: string]: unknown
}>) => (
  <button onClick={onClick} className={className} disabled={disabled} {...props}>
    {children}
  </button>
)

export const ScrollView = ({
  children,
  className,
  scrollX: _scrollX,
  scrollY: _scrollY,
  style,
  ...props
}: React.PropsWithChildren<{
  className?: string
  scrollX?: boolean
  scrollY?: boolean
  style?: React.CSSProperties | string
  [key: string]: unknown
}>) => (
  <div className={className} style={style as React.CSSProperties} {...props}>
    {children}
  </div>
)

export const Image = ({
  src,
  className,
  alt,
  ...props
}: {
  src?: string
  className?: string
  alt?: string
  [key: string]: unknown
}) => (
  <img src={src} className={className} alt={alt ?? ''} {...props} />
)
