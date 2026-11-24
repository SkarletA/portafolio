import { useTranslation } from 'react-i18next'
import { profile } from '@portfolio-data/profile'
import s from './ContinuingEducation.module.css'

export function ContinuingEducation() {
  const { t } = useTranslation('continuingEducation')

  return (
    <section id="formacion-continua" className={s.section}>
      <div className={s.inner}>
        <div className={s.heading}>
          <span className={s.number}>03</span>
          <h2 className={s.title}>{t('heading')}</h2>
        </div>

        <div className={s.grid}>
          <div className={s.block}>
            <h3 className={s.blockHeading}>{t('educationHeading')}</h3>
            <p className={s.educationLine} data-testid="continuing-education-degree">
              {t('education.degree')}, {t('education.org')}
            </p>

            <h3 className={s.blockHeading}>{t('certificationsHeading')}</h3>
            <ul className={s.pillList}>
              {profile.certifications.map((cert) => (
                <li key={cert.key} className={s.pill} data-testid={`continuing-education-certification-${cert.key}`}>
                  {t(`certifications.${cert.key}`)}
                  <span className={s.pillMeta}>
                    {' '}
                    · {t(`certificationKindLabels.${cert.kind}`)} · {cert.issuer}
                  </span>
                </li>
              ))}
            </ul>

            <h3 className={s.blockHeading}>{t('languagesHeading')}</h3>
            <p className={s.languagesLine}>
              {profile.languages
                .map((lang) => `${t(`languageNames.${lang.key}`)}: ${t(`languageLevels.${lang.levelKey}`)}`)
                .join(' · ')}
            </p>
          </div>

          <div className={s.block}>
            <h3 className={s.blockHeading}>{t('badgesHeading')}</h3>
            {profile.badges.length > 0 ? (
              <ul className={s.pillList}>
                {profile.badges.map((badge) => (
                  <li key={badge.name} className={s.pill}>
                    {badge.name}
                  </li>
                ))}
              </ul>
            ) : null}
            <a
              className={s.credlyLink}
              href={profile.credlyUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="continuing-education-credly-link"
            >
              {t('credlyLink')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
