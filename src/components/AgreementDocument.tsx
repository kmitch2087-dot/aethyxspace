import { useRef, useState, useCallback, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Printer, Loader2, Eye } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AgreementRecord {
  id?: string
  client_profile_id: string
  project_scope: string
  services_included: string
  total_investment?: number
  down_payment_amount?: number
  payment_schedule: string
  timeline_start?: string
  timeline_end?: string
  revision_rounds: number
  hosting_notes: string
  additional_terms: string
  client_legal_name: string
  client_company: string
  client_address: string
  client_signature_data?: string
  client_signed_at?: string
  id_document_path?: string
  is_locked: boolean
  submitted_at?: string
  down_payment_status: string
  sent_at?: string | null
  unlock_count?: number
}

interface AgreementDocumentProps {
  record: AgreementRecord
  clientProfileId: string
  clientName: string
  clientEmail: string
  logoUrl?: string
  mode: "admin" | "client" | "view"
  onSave: (updates: Partial<AgreementRecord>) => Promise<void>
  onSubmit: () => void
}

export default function AgreementDocument({
  record,
  clientProfileId,
  clientName,
  clientEmail,
  logoUrl,
  mode: modeProp,
  onSave,
  onSubmit,
}: AgreementDocumentProps) {
  const { toast } = useToast()
  const mode = record.is_locked ? "view" : modeProp

  const [projectScope, setProjectScope] = useState(record.project_scope || "")
  const [servicesIncluded, setServicesIncluded] = useState(record.services_included || "")
  const [totalInvestment, setTotalInvestment] = useState(
    record.total_investment !== undefined ? String(record.total_investment) : ""
  )
  const [downPaymentAmount, setDownPaymentAmount] = useState(
    record.down_payment_amount !== undefined ? String(record.down_payment_amount) : ""
  )
  const [paymentSchedule, setPaymentSchedule] = useState(record.payment_schedule || "")
  const [timelineStart, setTimelineStart] = useState(record.timeline_start || "")
  const [timelineEnd, setTimelineEnd] = useState(record.timeline_end || "")
  const [revisionRounds, setRevisionRounds] = useState(String(record.revision_rounds ?? 3))
  const [hostingNotes, setHostingNotes] = useState(record.hosting_notes || "")
  const [additionalTerms, setAdditionalTerms] = useState(record.additional_terms || "")

  const [clientLegalName, setClientLegalName] = useState(record.client_legal_name || "")
  const [clientCompany, setClientCompany] = useState(record.client_company || "")
  const [clientAddress, setClientAddress] = useState(record.client_address || "")

  const [signatureData, setSignatureData] = useState(record.client_signature_data || "")
  const [isDrawing, setIsDrawing] = useState(false)
  const [idUploaded, setIdUploaded] = useState(!!record.id_document_path)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [viewIdOpen, setViewIdOpen] = useState(false)
  const [viewIdUrl, setViewIdUrl] = useState<string | null>(null)
  const [viewIdLoading, setViewIdLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collectAdminFields = useCallback((): Partial<AgreementRecord> => ({
    project_scope: projectScope,
    services_included: servicesIncluded,
    total_investment: totalInvestment !== "" ? Number(totalInvestment) : undefined,
    down_payment_amount: downPaymentAmount !== "" ? Number(downPaymentAmount) : undefined,
    payment_schedule: paymentSchedule,
    timeline_start: timelineStart || undefined,
    timeline_end: timelineEnd || undefined,
    revision_rounds: Number(revisionRounds),
    hosting_notes: hostingNotes,
    additional_terms: additionalTerms,
  }), [
    projectScope, servicesIncluded, totalInvestment, downPaymentAmount,
    paymentSchedule, timelineStart, timelineEnd, revisionRounds,
    hostingNotes, additionalTerms,
  ])

  const collectClientFields = useCallback((): Partial<AgreementRecord> => ({
    client_legal_name: clientLegalName,
    client_company: clientCompany,
    client_address: clientAddress,
  }), [clientLegalName, clientCompany, clientAddress])

  const triggerAutoSave = useCallback(() => {
    if (mode === "view") return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const fields = mode === "admin"
        ? collectAdminFields()
        : collectClientFields()
      onSave(fields).catch(() => {})
    }, 500)
  }, [mode, collectAdminFields, collectClientFields, onSave])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    setIsDrawing(true)
    const { x, y } = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    const { x, y } = getPos(e, canvas)
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#1a1a1a"
    ctx.lineTo(x, y); ctx.stroke()
  }

  const stopDraw = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) setSignatureData(canvas.toDataURL("image/png"))
  }

  const clearSig = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureData("")
  }

  const handleIdUpload = async (file: File) => {
    const path = `${clientProfileId}/id/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from("client-slot-docs").upload(path, file)
    if (!error) {
      await onSave({ id_document_path: path })
      setIdUploaded(true)
      toast({ title: "ID uploaded successfully" })
    } else {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(collectAdminFields())
      toast({ title: "Agreement saved" })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleClientSave = async () => {
    setSaving(true)
    try {
      await onSave(collectClientFields())
      toast({ title: "Progress saved" })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleSendToClient = async () => {
    setSending(true)
    try {
      await onSave({ ...collectAdminFields(), sent_at: new Date().toISOString() })
      toast({ title: "Sent to client" })
    } catch {
      toast({ title: "Send failed", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      await onSave({ is_locked: false, unlock_count: (record.unlock_count ?? 0) + 1 })
      toast({ title: "Unlocked for one correction" })
    } catch {
      toast({ title: "Unlock failed", variant: "destructive" })
    } finally {
      setUnlocking(false)
    }
  }

  const handleViewId = async () => {
    if (!record.id_document_path) return
    setViewIdOpen(true)
    setViewIdLoading(true)
    const { data, error } = await supabase.storage
      .from("client-slot-docs")
      .createSignedUrl(record.id_document_path, 300)
    setViewIdLoading(false)
    if (error || !data) {
      toast({ title: "Could not load ID", description: error?.message, variant: "destructive" })
      return
    }
    setViewIdUrl(data.signedUrl)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSave({
        ...collectClientFields(),
        client_signature_data: signatureData,
        client_signed_at: new Date().toISOString(),
        is_locked: true,
      })
      onSubmit()
    } catch {
      toast({ title: "Submission failed", variant: "destructive" })
      setSubmitting(false)
    }
  }

  const handleConfirmSubmit = () => {
    setConfirmSubmitOpen(false)
    handleSubmit()
  }

  const canSubmit =
    clientLegalName.trim() !== "" &&
    clientCompany.trim() !== "" &&
    signatureData !== "" &&
    (idUploaded || !!record.id_document_path)

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
  const submittedFormatted = record.submitted_at
    ? new Date(record.submitted_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null

  function Field({
    label,
    value,
    onChange,
    editableIn,
    multiline = false,
    type = "text",
  }: {
    label?: string
    value: string
    onChange: (v: string) => void
    editableIn: "admin" | "client" | "both" | "none"
    multiline?: boolean
    type?: string
  }) {
    const editable =
      !record.is_locked &&
      (editableIn === "both" ||
        (editableIn === "admin" && mode === "admin") ||
        (editableIn === "client" && mode === "client"))

    if (editable) {
      if (multiline) {
        return (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={triggerAutoSave}
            className="w-full border-b border-gray-300 focus:border-teal-500 outline-none bg-yellow-50 rounded px-1 py-0.5 min-h-[80px] text-sm resize-y"
            placeholder={label}
          />
        )
      }
      return (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={triggerAutoSave}
          className="border-b border-gray-300 focus:border-teal-500 outline-none bg-yellow-50 rounded px-1 py-0.5 w-full text-sm"
          placeholder={label}
        />
      )
    }
    return (
      <span className={value ? "text-gray-900" : "text-gray-400 italic"}>
        {value || `[${label || "Not provided"}]`}
      </span>
    )
  }

  const sectionClass = "mb-8"
  const sectionTitle = "text-sm font-bold uppercase tracking-wider text-gray-700 mb-3 border-b border-gray-200 pb-1"
  const bodyText = "text-sm text-gray-700 leading-relaxed"
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5"
  const fieldRow = "mb-3"

  return (
    <div className="agreement-print-root">
      <style>{`
        @media print {
          body > * { display: none !important; }
          .agreement-print-root { display: block !important; }
          .no-print { display: none !important; }
          .agreement-print-root { box-shadow: none; padding: 0; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto bg-white text-gray-900 p-8 md:p-12 shadow-sm rounded-lg print:shadow-none print:p-0">

        {/* HEADER */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {logoUrl ? (
            <img src={logoUrl} className="h-16 object-contain" alt="Client logo" />
          ) : (
            <div className="h-16 w-32 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
              <span className="text-xs text-gray-400">Client Logo</span>
            </div>
          )}
          <span className="text-2xl font-light text-gray-400">+</span>
          <img
            src="/aethyx-web-design-studio-logo-B8RGRc5H.png"
            className="h-16 object-contain"
            alt="Aethyx"
          />
        </div>

        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Aethyx Web Design Studio</p>
          <h1 className="text-xl font-bold tracking-wide mt-1">Service Agreement</h1>
        </div>

        <hr className="border-gray-300 mb-8" />

        {/* PARTIES */}
        <div className={sectionClass}>
          <p className={bodyText + " mb-4"}>
            <strong>Between:</strong><br />
            Aethyx Web Design Studio ("Service Provider")<br />
            kristinmitchell@aethyx.space · aethyx.space
          </p>
          <p className={bodyText + " mb-3"}><strong>And:</strong></p>
          <div className="pl-4 space-y-2">
            <div className={fieldRow}>
              <div className={labelClass}>Legal Name</div>
              <div className="flex items-center gap-2">
                <Field
                  label="Client legal name"
                  value={clientLegalName}
                  onChange={setClientLegalName}
                  editableIn="client"
                />
                <span className={bodyText}>("Client")</span>
              </div>
            </div>
            <div className={fieldRow}>
              <div className={labelClass}>Company</div>
              <Field
                label="Company name"
                value={clientCompany}
                onChange={setClientCompany}
                editableIn="client"
              />
            </div>
            <div className={fieldRow}>
              <div className={labelClass}>Address</div>
              <Field
                label="Mailing address"
                value={clientAddress}
                onChange={setClientAddress}
                editableIn="client"
              />
            </div>
          </div>
        </div>

        {/* SECTION 1 — SCOPE */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>1. Scope of Services</h2>
          <div className={fieldRow}>
            <Field
              label="Describe the project scope…"
              value={projectScope}
              onChange={setProjectScope}
              editableIn="admin"
              multiline
            />
          </div>
          <p className={bodyText + " mt-3 mb-1"}>Services included in this agreement:</p>
          <div className={fieldRow}>
            <Field
              label="List services included…"
              value={servicesIncluded}
              onChange={setServicesIncluded}
              editableIn="admin"
              multiline
            />
          </div>
        </div>

        {/* SECTION 2 — TIMELINE */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>2. Project Timeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <div className={labelClass}>Start Date</div>
              <Field
                label="Start date"
                value={timelineStart}
                onChange={setTimelineStart}
                editableIn="admin"
                type="date"
              />
            </div>
            <div>
              <div className={labelClass}>Estimated Completion</div>
              <Field
                label="End date"
                value={timelineEnd}
                onChange={setTimelineEnd}
                editableIn="admin"
                type="date"
              />
            </div>
          </div>
          <p className={bodyText}>
            <em>Note:</em> Timelines are estimates and may vary based on client response time, feedback
            turnaround, and third-party dependencies. Significant client-side delays may extend the
            estimated timeline.
          </p>
        </div>

        {/* SECTION 3 — INVESTMENT */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>3. Investment &amp; Payment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <div className={labelClass}>Total Project Investment</div>
              <div className="flex items-center gap-1 text-sm">
                <span>$</span>
                <Field
                  label="Amount"
                  value={totalInvestment}
                  onChange={setTotalInvestment}
                  editableIn="admin"
                  type="number"
                />
              </div>
            </div>
            <div>
              <div className={labelClass}>Down Payment (due upon signing)</div>
              <div className="flex items-center gap-1 text-sm">
                <span>$</span>
                <Field
                  label="Amount"
                  value={downPaymentAmount}
                  onChange={setDownPaymentAmount}
                  editableIn="admin"
                  type="number"
                />
              </div>
            </div>
          </div>
          <div className={fieldRow}>
            <div className={labelClass}>Payment Schedule</div>
            <Field
              label="Describe payment milestones…"
              value={paymentSchedule}
              onChange={setPaymentSchedule}
              editableIn="admin"
              multiline
            />
          </div>
          <p className={bodyText + " mt-3"}>
            All invoices are due within 5 business days of issuance. Aethyx Web Design Studio
            reserves the right to pause work on any project with an outstanding balance of 14
            days or more. Payments processed via Stripe are subject to standard processing fees.
          </p>
          <p className={bodyText + " mt-2"}>
            All payments are final. Down payments and deposits are non-refundable once design work
            has commenced.
          </p>
        </div>

        {/* SECTION 4 — REVISIONS */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>4. Revision Policy</h2>
          <p className={bodyText}>
            This agreement includes{" "}
            <span className="inline-block min-w-[3rem]">
              <Field
                label="3"
                value={revisionRounds}
                onChange={setRevisionRounds}
                editableIn="admin"
                type="number"
              />
            </span>{" "}
            rounds of revisions per deliverable, applied across the design and development phases.
            Revisions are defined as adjustments to existing elements — not scope expansions or new
            feature requests.
          </p>
          <p className={bodyText + " mt-2"}>
            Additional revision rounds may be requested at $75/hour and will be invoiced separately.
          </p>
        </div>

        {/* SECTION 5 — IP */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>5. Intellectual Property</h2>
          <p className={bodyText}>
            Upon receipt of final payment, the Client receives full ownership of all final
            deliverables, including design files, code, and written content produced by Aethyx
            Web Design Studio for this project.
          </p>
          <p className={bodyText + " mt-2"}>
            Aethyx Web Design Studio retains the right to display completed work in its portfolio,
            case studies, and marketing materials unless the Client requests confidentiality in writing.
          </p>
          <p className={bodyText + " mt-2"}>
            Third-party assets (stock photography, licensed fonts, plugins) remain subject to their
            respective licenses and are not transferred as part of this agreement.
          </p>
        </div>

        {/* SECTION 6 — HOSTING */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>6. Hosting &amp; Maintenance</h2>
          <Field
            label="Hosting and ongoing maintenance details to be outlined here."
            value={hostingNotes}
            onChange={setHostingNotes}
            editableIn="admin"
            multiline
          />
        </div>

        {/* SECTION 7 — CLIENT RESPONSIBILITIES */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>7. Client Responsibilities</h2>
          <p className={bodyText + " mb-2"}>The Client agrees to:</p>
          <ul className={bodyText + " list-none space-y-1 pl-2"}>
            <li>• Provide all required content (text, images, brand assets) within 7 days of project kickoff.</li>
            <li>• Respond to design reviews, revision requests, and questions within 3 business days.</li>
            <li>• Designate a single primary point of contact for all project communication.</li>
          </ul>
          <p className={bodyText + " mt-3"}>
            Delays caused by late content delivery or lack of response will extend the project
            timeline proportionally and do not constitute grounds for a refund.
          </p>
        </div>

        {/* SECTION 8 — CANCELLATION */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>8. Cancellation &amp; Termination</h2>
          <p className={bodyText}>
            Either party may terminate this agreement with 7 days written notice.
          </p>
          <p className={bodyText + " mt-2"}>
            If the Client cancels after work has commenced, all completed work will be invoiced at
            the pro-rated project rate. The initial down payment is non-refundable.
          </p>
          <p className={bodyText + " mt-2"}>
            If Aethyx Web Design Studio terminates the agreement due to client misconduct or
            non-payment, all work product completed to date remains the property of Aethyx Web
            Design Studio until outstanding balances are settled.
          </p>
        </div>

        {/* SECTION 9 — CONFIDENTIALITY */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>9. Confidentiality</h2>
          <p className={bodyText}>
            Both parties agree to keep confidential any proprietary business information shared
            during the course of this project. This includes but is not limited to business
            strategies, client lists, pricing structures, and unreleased products or services.
          </p>
        </div>

        {/* SECTION 10 — ADDITIONAL TERMS */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>10. Additional Terms &amp; Conditions</h2>
          <Field
            label="Any additional terms or conditions…"
            value={additionalTerms}
            onChange={setAdditionalTerms}
            editableIn="admin"
            multiline
          />
        </div>

        {/* SECTION 11 — GOVERNING LAW */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>11. Governing Law</h2>
          <p className={bodyText}>
            This agreement shall be governed by and construed in accordance with applicable law.
            Any disputes arising under this agreement shall first be attempted to be resolved
            through good-faith negotiation between the parties.
          </p>
        </div>

        {/* SECTION 12 — SIGNATURES */}
        <div className={sectionClass}>
          <h2 className={sectionTitle}>12. Agreement &amp; Signatures</h2>
          <p className={bodyText + " mb-6"}>
            By signing below, both parties confirm they have read, understood, and agree to all
            terms outlined in this Service Agreement.
          </p>

          {/* CLIENT SIGNATURE BLOCK */}
          <div className="border-t border-gray-300 pt-5 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Client</p>

            <div className="space-y-3 mb-5">
              <div>
                <div className={labelClass}>Legal Name</div>
                <Field
                  label="Full legal name"
                  value={clientLegalName}
                  onChange={setClientLegalName}
                  editableIn="client"
                />
              </div>
              <div>
                <div className={labelClass}>Company</div>
                <Field
                  label="Company name"
                  value={clientCompany}
                  onChange={setClientCompany}
                  editableIn="client"
                />
              </div>
              <div>
                <div className={labelClass}>Address</div>
                <Field
                  label="Mailing address"
                  value={clientAddress}
                  onChange={setClientAddress}
                  editableIn="client"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className={labelClass + " mb-2"}>Signature</div>
              {mode === "client" && !record.is_locked ? (
                <div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="border border-gray-300 rounded bg-white touch-none cursor-crosshair w-full"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                  <button
                    onClick={clearSig}
                    className="mt-1 text-xs text-gray-400 hover:text-red-500 underline"
                  >
                    Clear signature
                  </button>
                </div>
              ) : record.client_signature_data ? (
                <img
                  src={record.client_signature_data}
                  alt="Signature"
                  className="h-16 border-b border-gray-300"
                />
              ) : (
                <span className="text-gray-400 italic text-sm">Not signed</span>
              )}
            </div>

            <div className="mb-4">
              <div className={labelClass}>Date</div>
              <span className={bodyText}>
                {record.client_signed_at
                  ? new Date(record.client_signed_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : mode === "client" && signatureData
                  ? todayFormatted
                  : <span className="text-gray-400 italic">Awaiting signature</span>}
              </span>
            </div>

            <div>
              <div className={labelClass + " mb-2"}>Photo ID / License</div>
              {mode === "client" && !record.is_locked ? (
                idUploaded || record.id_document_path ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                    ID Verified ✓
                  </span>
                ) : (
                  <label className="cursor-pointer inline-flex items-center gap-2 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
                    <span>Upload Photo ID</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleIdUpload(file)
                      }}
                    />
                  </label>
                )
              ) : record.id_document_path ? (
                <span className="inline-flex items-center gap-2 text-sm text-green-600 font-medium">
                  ID Verified ✓
                  {modeProp === "admin" && (
                    <button
                      type="button"
                      onClick={handleViewId}
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 font-normal underline no-print"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  )}
                </span>
              ) : (
                <span className="text-gray-400 italic text-sm">Not submitted</span>
              )}
            </div>
          </div>

          {/* PROVIDER SIGNATURE BLOCK */}
          <div className="border-t border-gray-300 pt-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Service Provider</p>
            <p className={bodyText}>
              Kristin Mitchell<br />
              Aethyx Web Design Studio<br />
              kristinmitchell@aethyx.space<br />
              aethyx.space
            </p>
            <div className="mt-3">
              <div className={labelClass}>Date</div>
              <span className={bodyText}>
                {submittedFormatted || todayFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="no-print flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100">
          {mode === "admin" && (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Agreement
              </Button>
              {!record.sent_at && (
                <Button variant="outline" onClick={handleSendToClient} disabled={sending}>
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send to Client
                </Button>
              )}
            </>
          )}

          {mode === "client" && (
            <>
              <Button variant="outline" onClick={handleClientSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Progress
              </Button>
              <Button
                onClick={() => setConfirmSubmitOpen(true)}
                disabled={!canSubmit || submitting}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Agreement
              </Button>
            </>
          )}

          {mode === "view" && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Agreement
            </Button>
          )}

          {modeProp === "admin" && record.is_locked && (record.unlock_count ?? 0) === 0 && (
            <Button variant="outline" onClick={handleUnlock} disabled={unlocking}>
              {unlocking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unlock for Correction
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, this agreement is final and cannot be changed. Are you sure you
              want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Submit Agreement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewIdOpen} onOpenChange={(open) => { setViewIdOpen(open); if (!open) setViewIdUrl(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Photo ID</DialogTitle>
          </DialogHeader>
          {viewIdLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewIdUrl ? (
            record.id_document_path?.toLowerCase().endsWith(".pdf") ? (
              <iframe src={viewIdUrl} className="w-full h-[70vh] border-0" title="Client ID document" />
            ) : (
              <img src={viewIdUrl} alt="Client ID document" className="w-full h-auto rounded" />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
