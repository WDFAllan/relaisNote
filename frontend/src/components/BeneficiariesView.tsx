import { useEffect, useState, type FormEvent } from 'react'
import type { Beneficiary, Service, Tag, Transmission } from '../types'

type BeneficiariesViewProps = {
  beneficiaries: Beneficiary[]
  services: Service[]
  selectedId: string | null
  setSelectedId: (id: string) => void
  selected?: Beneficiary
  transmissions: Transmission[]
  tags: Tag[]
  error: string
  isAdmin: boolean
  onCreateBeneficiary: (event: FormEvent<HTMLFormElement>) => void
  onArchiveBeneficiary: (beneficiary: Beneficiary) => void
  onCreateTransmission: (event: FormEvent<HTMLFormElement>) => void
  onChangeService: (beneficiary: Beneficiary, serviceId: string | null) => Promise<void>
}

export function BeneficiariesView({
  beneficiaries,
  services,
  selectedId,
  setSelectedId,
  selected,
  transmissions,
  tags,
  error,
  isAdmin,
  onCreateBeneficiary,
  onArchiveBeneficiary,
  onCreateTransmission,
  onChangeService,
}: BeneficiariesViewProps) {
  const [selectedTransmissionTagId, setSelectedTransmissionTagId] = useState('')
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [nextServiceId, setNextServiceId] = useState('')

  const filteredTransmissions = transmissions.filter((item) => {
    if (showOnlyAlerts && !item.tags.some((tag) => tag.estAlerte)) return false
    if (selectedTransmissionTagId && !item.tags.some((tag) => tag.id === selectedTransmissionTagId)) return false
    return true
  })

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>('.sidebar .search-box input')
    if (!input) return

    const filterRows = () => {
      const query = input.value.trim().toLocaleLowerCase()
      document.querySelectorAll<HTMLElement>('.sidebar .person-row').forEach((row) => {
        const text = row.textContent?.toLocaleLowerCase() ?? ''
        row.style.display = text.includes(query) ? '' : 'none'
      })
    }

    input.addEventListener('input', filterRows)
    return () => input.removeEventListener('input', filterRows)
  }, [beneficiaries])

  return (
    <section className="workspace">
      <aside className="sidebar">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SUIVI ACTUEL</p>
            <h2>Bénéficiaires</h2>
          </div>
        </div>

        {isAdmin && (
          <form className="quick-create" onSubmit={onCreateBeneficiary}>
            <label>
              Nouveau bénéficiaire
              <input name="prenom" placeholder="Prénom" required />
            </label>
            <label>
              Service
              <select name="serviceId" defaultValue="">
                <option value="">Sans service</option>
                {services.map((service) => <option value={service.id} key={service.id}>{service.nom}</option>)}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Créer <span>+</span>
            </button>
          </form>
        )}

        <div className="search-box">
          ⌕ <input placeholder="Rechercher..." />
        </div>

        <div className="people-list">
          {beneficiaries.map((item) => (
            <button
              key={item.id}
              className={`person-row ${selectedId === item.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <span className="avatar">{item.prenom[0]}</span>
              <span>
                <strong>{item.prenom}</strong>
                <small>{item.referentNom ?? 'Sans référent'}</small>
              </span>
              <span className="chevron">›</span>
            </button>
          ))}

          {beneficiaries.length === 0 && <p className="empty">Aucun bénéficiaire actif.</p>}
        </div>
      </aside>

      <section className="content">
        <div className="content-heading">
          <div>
            <p className="eyebrow">CARNET DE TRANSMISSIONS</p>
            <h1>{selected?.prenom ?? 'Sélectionnez un bénéficiaire'}</h1>
            {selected && (
              <p className="meta">
                <span className="active-pill">Actif</span> {transmissions.length} transmission
                {transmissions.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {isAdmin && selected && (
            <div className="heading-actions">
              <button className="outline-button" onClick={() => { setNextServiceId(selected.serviceId ?? ''); setShowServiceModal(true) }}>Changer de service</button>
              <button className="delete-button" onClick={() => onArchiveBeneficiary(selected)}>Archiver</button>
            </div>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {selected ? (
          <>
            <form className="transmission-form" onSubmit={onCreateTransmission}>
              <div className="form-label">
                <span>Nouvelle transmission</span>
                <small>Partagez une observation avec l’équipe</small>
              </div>

              <textarea name="texte" placeholder="Écrire une observation..." required />

              <div className="form-actions">
                <select name="tagId" defaultValue="">
                  <option value="">Sans tag</option>
                  {tags.map((tag) => (
                    <option value={tag.id} key={tag.id}>
                      {tag.libelle}
                    </option>
                  ))}
                </select>

                <button className="primary-button" type="submit">
                  Publier <span>↗</span>
                </button>
              </div>
            </form>

            <div className="transmission-filters">
              <button
                type="button"
                className={`filter-chip ${showOnlyAlerts ? 'active alert' : ''}`}
                onClick={() => setShowOnlyAlerts((value) => !value)}
              >
                Alertes
              </button>

              <select
                className="filter-select"
                value={selectedTransmissionTagId}
                onChange={(event) => setSelectedTransmissionTagId(event.target.value)}
              >
                <option value="">Tous les tags</option>
                {tags.map((tag) => (
                  <option value={tag.id} key={tag.id}>
                    {tag.libelle}
                  </option>
                ))}
              </select>
            </div>

            {filteredTransmissions.length === 0 ? (
              <div className="empty-state">
                <span>•</span>
                <h3>Aucune transmission</h3>
                <p>Essayez un autre filtre ou ajoutez une observation.</p>
              </div>
            ) : (
              <div className="timeline">
                {filteredTransmissions.map((item) => (
                  <article className="transmission" key={item.id}>
                    <span className="timeline-dot" />
                    <div className="transmission-head">
                      <strong>{item.auteurNom ?? 'Équipe'}</strong>
                      <time>{new Date(item.creeLe).toLocaleDateString('fr-FR')}</time>
                    </div>
                    <p>{item.texte}</p>
                    <div className="tag-list">
                      {item.tags.map((tag) => (
                        <span key={`${item.id}-${tag.id}`} className={`tag ${tag.estAlerte ? 'alert' : ''}`}>
                          {tag.libelle}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state large">
            <span>✦</span>
            <h3>Choisissez un bénéficiaire</h3>
            <p>La liste de gauche contient les personnes suivies. Sélectionnez-en une pour lire ses transmissions.</p>
          </div>
        )}
      </section>
      {showServiceModal && selected && (
        <div
          className="organization-modal-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setShowServiceModal(false) }}
        >
          <section className="organization-modal" role="dialog" aria-modal="true">
            <div className="panel-heading">
              <h2>Changer de service</h2>
              <button className="close-action" onClick={() => setShowServiceModal(false)}>Fermer</button>
            </div>
            <p className="delete-copy">Déplacez <strong>{selected.prenom}</strong> vers un autre service.</p>
            <form
              className="organization-form"
              onSubmit={async (event) => {
                event.preventDefault()
                await onChangeService(selected, nextServiceId || null)
                setShowServiceModal(false)
              }}
            >
              <label>
                Service
                <select value={nextServiceId} onChange={(event) => setNextServiceId(event.target.value)}>
                  <option value="">Sans service</option>
                  {services.map((service) => <option value={service.id} key={service.id}>{service.nom}</option>)}
                </select>
              </label>
              <button className="primary-button" type="submit">Enregistrer <span>→</span></button>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
