import { useCallback, useState, type ChangeEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import s from './PasswordInput.module.css'

interface PasswordInputProps {
  label: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  /** Base id for this field's own testid and its visibility-toggle button's testid. */
  testId: string
  required?: boolean
}

/** A password field with a show/hide toggle. */
export function PasswordInput({ label, value, onChange, testId, required = false }: PasswordInputProps) {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)

  const handleToggleVisibility = useCallback(() => {
    setVisible((current) => !current)
  }, [])

  return (
    <label className={s.field}>
      {label}
      <div className={s.inputWrap}>
        <input
          type={visible ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={onChange}
          className={s.input}
          data-testid={testId}
        />
        <button
          type="button"
          onClick={handleToggleVisibility}
          aria-label={visible ? t('passwordVisibility.hide') : t('passwordVisibility.show')}
          className={s.toggle}
          data-testid={`${testId}-visibility-toggle`}
        >
          {visible ? <EyeOff className={s.icon} /> : <Eye className={s.icon} />}
        </button>
      </div>
    </label>
  )
}
