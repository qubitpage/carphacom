"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { TractorModel } from "@lib/data/tractor-configurator"

type TractorConfiguratorProps = {
  tractors: TractorModel[]
  showPrices: boolean
}

function formatPrice(value: number | null | undefined, showPrices: boolean) {
  if (!showPrices || !value) return "La cerere"
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)
}

export default function TractorConfigurator({ tractors, showPrices }: TractorConfiguratorProps) {
  const searchParams = useSearchParams()
  const requestedHandle = searchParams.get("tractor")
  const initial = tractors.find((tractor) => tractor.handle === requestedHandle) || tractors.find((tractor) => tractor.option_count > 0) || tractors[0]
  const [selectedId, setSelectedId] = useState(initial?.id || "")
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])

  const selectedTractor = tractors.find((tractor) => tractor.id === selectedId) || tractors[0]
  const selectedOptions = useMemo(() => {
    if (!selectedTractor) return []
    return selectedTractor.options.filter((option) => selectedOptionIds.includes(option.id))
  }, [selectedTractor, selectedOptionIds])

  const optionsTotal = selectedOptions.reduce((sum, option) => sum + Number(option.price_eur || 0), 0)
  const estimatedTotal = (selectedTractor?.base_price_eur || 0) + optionsTotal

  const selectTractor = (tractorId: string) => {
    setSelectedId(tractorId)
    setSelectedOptionIds([])
  }

  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((current) => current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId])
  }

  if (!selectedTractor) {
    return (
      <div className="content-container py-16 text-center">
        <h1 className="text-3xl font-bold text-white">Configurator tractor</h1>
        <p className="mt-3 text-dark-300">Nu există tractoare Farmtrac configurabile în catalog.</p>
      </div>
    )
  }

  return (
    <main className="bt-config-page">
      <style>{`
        .bt-config-page{--bordeaux:#7d2424;--bordeaux-d:#5a1818;--walnut:#4a2a1e;--walnut-d:#2e1a10;--cream:#fbf6e9;--cream-2:#f3ead0;--gold:#b08a3e;--gold-soft:#d9b96a;--ink:#2a1a12;min-height:100vh;background:var(--cream);color:var(--ink);font-family:Inter,system-ui,sans-serif;}
        .bt-config-hero{position:relative;overflow:hidden;background:#1a0f08;border-bottom:8px solid var(--bordeaux);}
        .bt-config-hero::before{content:"";position:absolute;inset:0;background:url('/images/showroom-farm-bg.jpg?v=p141b') center/cover no-repeat;filter:saturate(1.05) contrast(1.03);}
        .bt-config-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(26,15,8,.84),rgba(74,42,30,.68) 46%,rgba(26,15,8,.52)),linear-gradient(180deg,rgba(20,12,6,.35),rgba(20,12,6,.7));}
        .bt-config-hero-inner{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:58px 24px;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:34px;align-items:center;}
        .bt-config-eyebrow{display:inline-flex;align-items:center;gap:10px;padding:7px 14px;background:rgba(125,36,36,.92);border:1px solid rgba(217,185,106,.55);border-radius:999px;color:var(--cream);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;box-shadow:0 8px 22px rgba(0,0,0,.18);}
        .bt-config-title{margin:18px 0 0;font-family:Georgia,'Playfair Display',serif;font-size:clamp(32px,5vw,58px);line-height:1.03;color:var(--cream);font-weight:700;text-shadow:0 4px 24px rgba(0,0,0,.65);}
        .bt-config-lead{margin:16px 0 0;max-width:760px;color:rgba(251,246,233,.9);font-size:16px;line-height:1.7;text-shadow:0 2px 10px rgba(0,0,0,.45);}
        .bt-config-stats{margin-top:24px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:620px;}
        .bt-config-stat{border-radius:8px;background:linear-gradient(180deg,rgba(74,42,30,.82),rgba(46,26,16,.88));border:1px solid rgba(217,185,106,.45);padding:14px 16px;color:var(--cream);box-shadow:0 10px 20px -14px rgba(0,0,0,.8);}
        .bt-config-stat strong{display:block;color:var(--gold-soft);font-size:28px;line-height:1;font-weight:800;}
        .bt-config-stat span{display:block;margin-top:5px;color:rgba(251,246,233,.76);font-size:12px;font-weight:700;}
        .bt-config-preview{border-radius:8px;background:rgba(251,246,233,.95);border:1px solid rgba(217,185,106,.55);box-shadow:0 20px 45px -22px rgba(0,0,0,.75);padding:18px;color:var(--ink);}
        .bt-config-preview-media{aspect-ratio:4/3;border-radius:8px;overflow:hidden;background:linear-gradient(180deg,#f7f1df,#efe2bf);display:flex;align-items:center;justify-content:center;}
        .bt-config-preview-media img{width:100%;height:100%;object-fit:contain;padding:14px;}
        .bt-config-preview-label{margin-top:15px;color:var(--bordeaux);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;}
        .bt-config-preview h2{margin:4px 0 0;font-family:Georgia,'Playfair Display',serif;font-size:26px;line-height:1.15;color:var(--walnut);}
        .bt-config-preview p{margin:8px 0 0;color:#735c45;font-size:13px;}
        .bt-config-workspace{max-width:1280px;margin:0 auto;padding:34px 24px 58px;display:grid;grid-template-columns:360px minmax(0,1fr) 360px;gap:22px;align-items:start;}
        .bt-panel{border-radius:8px;background:#fff;border:1px solid rgba(125,36,36,.14);box-shadow:0 2px 8px rgba(74,42,30,.06);overflow:hidden;}
        .bt-panel-sticky{position:sticky;top:24px;}
        .bt-panel-head{padding:15px 18px;border-bottom:1px solid rgba(125,36,36,.12);background:#f8f0dc;}
        .bt-panel-head h2{margin:0;color:var(--walnut);font-size:16px;font-weight:800;}
        .bt-panel-head p{margin:5px 0 0;color:#7a6244;font-size:13px;line-height:1.5;}
        .bt-tractor-list{max-height:720px;overflow-y:auto;}
        .bt-tractor-button{width:100%;border:0;border-bottom:1px solid rgba(125,36,36,.1);background:#fff;padding:12px;text-align:left;cursor:pointer;transition:background .15s ease;}
        .bt-tractor-button:hover{background:#fbf6e9;}
        .bt-tractor-button.active{background:#f4ebd4;box-shadow:inset 4px 0 0 var(--bordeaux);}
        .bt-tractor-row{display:flex;gap:12px;align-items:center;}
        .bt-tractor-row img{height:64px;width:80px;border-radius:8px;background:#f3ead0;object-fit:contain;padding:5px;flex-shrink:0;}
        .bt-tractor-name{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--walnut);font-size:14px;font-weight:800;line-height:1.25;}
        .bt-tractor-meta{margin-top:4px;color:#7a6244;font-size:12px;}
        .bt-tractor-price{margin-top:3px;color:var(--bordeaux);font-size:12px;font-weight:800;}
        .bt-option{display:grid;grid-template-columns:auto 1fr;gap:14px;padding:15px 18px;border-bottom:1px solid rgba(125,36,36,.1);cursor:pointer;background:#fff;transition:background .15s ease;}
        .bt-option:hover{background:#fbf6e9;}
        .bt-option.checked{background:#f4ebd4;}
        .bt-option input{margin-top:3px;width:20px;height:20px;accent-color:var(--bordeaux);}
        .bt-option-title{display:block;color:var(--walnut);font-size:14px;font-weight:800;line-height:1.45;}
        .bt-option-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:5px;color:#7a6244;font-size:12px;}
        .bt-option-price{color:var(--bordeaux);font-weight:800;}
        .bt-empty{padding:22px;color:#7a6244;font-size:14px;line-height:1.6;}
        .bt-summary{padding:18px;}
        .bt-summary h2{margin:0 0 14px;color:var(--walnut);font-size:18px;font-weight:900;}
        .bt-summary-row{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid rgba(125,36,36,.12);font-size:14px;}
        .bt-summary-row span:first-child{color:#7a6244;}
        .bt-summary-row span:last-child{color:var(--walnut);font-weight:800;text-align:right;}
        .bt-selected-options{display:grid;gap:8px;margin:12px 0;}
        .bt-selected-option{display:flex;justify-content:space-between;gap:12px;color:#7a6244;font-size:12px;line-height:1.35;}
        .bt-selected-option strong{color:var(--bordeaux);white-space:nowrap;}
        .bt-total-box{border-radius:8px;background:var(--walnut);color:var(--cream);padding:15px;margin-top:14px;}
        .bt-total-box small{display:block;color:rgba(251,246,233,.72);font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;}
        .bt-total-box strong{display:block;margin-top:4px;color:var(--gold-soft);font-size:24px;}
        .bt-summary-actions{display:grid;gap:10px;margin-top:16px;}
        .bt-action-primary,.bt-action-secondary{display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:8px;padding:12px 16px;text-align:center;text-decoration:none;font-weight:900;transition:background .15s ease,transform .15s ease;}
        .bt-action-primary{background:var(--bordeaux);color:var(--cream);}
        .bt-action-primary:hover{background:var(--bordeaux-d);transform:translateY(-1px);}
        .bt-action-secondary{background:#fff;color:var(--bordeaux);border:1px solid rgba(125,36,36,.3);}
        .bt-action-secondary:hover{background:#fbf6e9;}
        @media (max-width:1180px){.bt-config-hero-inner{grid-template-columns:1fr;}.bt-config-preview{max-width:520px;}.bt-config-workspace{grid-template-columns:1fr 1fr;}.bt-summary-panel{grid-column:1/-1;}.bt-panel-sticky{position:static;}}
        @media (max-width:760px){.bt-config-hero-inner{padding:42px 16px 30px;}.bt-config-stats{grid-template-columns:1fr;}.bt-config-title{font-size:34px;}.bt-config-workspace{grid-template-columns:1fr;padding:24px 16px 42px;}.bt-config-preview h2{font-size:22px;}}
      `}</style>

      <section className="bt-config-hero">
        <div className="bt-config-hero-inner">
          <div>
            <div className="bt-config-eyebrow">Configurator oficial Farmtrac</div>
            <h1 className="bt-config-title">Configurează tractorul pentru ferma ta</h1>
            <p className="bt-config-lead">
              Alege modelul Farmtrac, apoi selectează doar opțiunile disponibile pentru acel model. Opțiunile cu același nume dar preț diferit rămân separate pe model, ca în catalogul oficial.
            </p>
            <div className="bt-config-stats">
              <div className="bt-config-stat">
                <strong>{tractors.length}</strong>
                <span>modele Farmtrac</span>
              </div>
              <div className="bt-config-stat">
                <strong>{selectedTractor.option_count}</strong>
                <span>opțiuni model</span>
              </div>
              <div className="bt-config-stat">
                <strong>24h</strong>
                <span>răspuns ofertă</span>
              </div>
            </div>
          </div>

          <div className="bt-config-preview">
            <div className="bt-config-preview-media">
              <img src={selectedTractor.thumbnail || "/placeholder.png"} alt={selectedTractor.title} />
            </div>
            <div className="bt-config-preview-label">Model selectat</div>
            <h2>{selectedTractor.title}</h2>
            <p>{selectedTractor.categories.join(" / ")}</p>
          </div>
        </div>
      </section>

      <section className="bt-config-workspace">
        <aside className="bt-panel bt-panel-sticky">
          <div className="bt-panel-head">
            <h2>1. Alege tractorul</h2>
          </div>
          <div className="bt-tractor-list">
            {tractors.map((tractor) => (
              <button key={tractor.id} type="button" onClick={() => selectTractor(tractor.id)} className={`bt-tractor-button ${tractor.id === selectedTractor.id ? "active" : ""}`}>
                <span className="bt-tractor-row">
                  <img src={tractor.thumbnail || "/placeholder.png"} alt="" />
                  <span className="min-w-0 flex-1">
                    <span className="bt-tractor-name">{tractor.title}</span>
                    <span className="bt-tractor-meta">{tractor.option_count} opțiuni</span>
                    <span className="bt-tractor-price">{formatPrice(tractor.base_price_eur, showPrices)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="bt-panel">
          <div className="bt-panel-head">
            <h2>2. Selectează opțiunile pentru {selectedTractor.title}</h2>
            <p>Lista se schimbă automat după model. Nu poți alege opțiuni de la alt tractor.</p>
          </div>
          <div>
            {selectedTractor.options.length > 0 ? selectedTractor.options.map((option) => {
              const checked = selectedOptionIds.includes(option.id)
              return (
                <label key={option.id} className={`bt-option ${checked ? "checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleOption(option.id)} />
                  <span>
                    <span className="bt-option-title">{option.label}</span>
                    <span className="bt-option-meta">
                      <span>{option.group}</span>
                      <span>•</span>
                      <span className="bt-option-price">{formatPrice(option.price_eur, showPrices)}</span>
                    </span>
                  </span>
                </label>
              )
            }) : (
              <div className="bt-empty">
                Acest model nu are opțiuni suplimentare în catalogul oficial. Poți solicita ofertă pentru configurația standard.
              </div>
            )}
          </div>
        </section>

        <aside className="bt-panel bt-panel-sticky bt-summary-panel">
          <div className="bt-summary">
            <h2>3. Rezumat configurație</h2>
            <div className="bt-summary-row">
              <span>Tractor</span>
              <span>{selectedTractor.title}</span>
            </div>
            <div className="bt-summary-row">
              <span>Preț bază</span>
              <span>{formatPrice(selectedTractor.base_price_eur, showPrices)}</span>
            </div>
            <div className="bt-summary-row">
              <span>Opțiuni selectate</span>
              <span>{selectedOptions.length}</span>
            </div>
            <div className="bt-selected-options">
              {selectedOptions.map((option) => (
                <div key={option.id} className="bt-selected-option">
                  <span className="line-clamp-2">{option.label}</span>
                  <strong>{formatPrice(option.price_eur, showPrices)}</strong>
                </div>
              ))}
            </div>
            {showPrices ? (
              <div className="bt-total-box">
                <small>Total estimativ</small>
                <strong>{formatPrice(estimatedTotal, true)}</strong>
              </div>
            ) : (
              <div className="bt-total-box">
                <small>Ofertă personalizată</small>
                <span>Prețurile sunt ascunse public. Adminul vede prețurile, iar clientul primește ofertă personalizată.</span>
              </div>
            )}
            <div className="bt-summary-actions">
              <LocalizedClientLink href={`/contact?product=${encodeURIComponent(selectedTractor.title)}&config=${encodeURIComponent(selectedOptions.map((option) => option.label).join("; "))}`} className="bt-action-primary">
                Cere ofertă personalizată
              </LocalizedClientLink>
              <LocalizedClientLink href={`/products/${selectedTractor.handle}`} className="bt-action-secondary">
                Vezi pagina modelului
              </LocalizedClientLink>
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
