import { requireAdmin } from '@/lib/auth';
import { getArtworkJob } from '@/lib/artwork/actions';
import { notFound } from 'next/navigation';
import { formatDate, getComponentTypeLabel, getComponentStatusLabel, getJobStatusLabel, getLightingTypeLabel } from '@/lib/artwork/utils';
import { DIMENSION_TOLERANCE_MM, ComponentStatus, ArtworkJobStatus } from '@/lib/artwork/types';
import { createServerClient } from '@/lib/supabase-server';

export default async function ArtworkJobPrintAllPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();

    const { id } = await params;
    const job = await getArtworkJob(id);

    if (!job) {
        notFound();
    }

    // Only include components that have design signed off
    const printableComponents = job.components.filter(c => c.design_signed_off_at);

    if (printableComponents.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <p style={{ fontSize: '16px', color: '#666' }}>
                    no components with signed-off designs to print
                </p>
            </div>
        );
    }

    // Generate signed URLs for all thumbnails and fetch extra items in parallel
    const supabase = await createServerClient();
    const thumbnailUrls: Record<string, string | null> = {};
    const itemsByComponent: Record<string, Array<{ id: string; label: string; sort_order: number; width_mm: number | null; height_mm: number | null; returns_mm: number | null }>> = {};

    await Promise.all(
        printableComponents.map(async (component) => {
            // Fetch thumbnail URL
            if (component.artwork_thumbnail_url) {
                const urlParts = component.artwork_thumbnail_url.split('/artwork-assets/');
                if (urlParts.length > 1) {
                    const storagePath = urlParts[1];
                    const { data } = await supabase.storage
                        .from('artwork-assets')
                        .createSignedUrl(storagePath, 3600);
                    thumbnailUrls[component.id] = data?.signedUrl || null;
                } else {
                    thumbnailUrls[component.id] = null;
                }
            } else {
                thumbnailUrls[component.id] = null;
            }

            // Fetch extra items
            const { data: items } = await supabase
                .from('artwork_component_items')
                .select('id, label, sort_order, width_mm, height_mm, returns_mm')
                .eq('component_id', component.id)
                .order('sort_order', { ascending: true });
            itemsByComponent[component.id] = items || [];
        })
    );

    return (
        <>
            <style>{`
                /* ===== A4 LANDSCAPE — MULTI-SHEET PRINT ===== */
                /* One component per page, no blank pages between */

                @media print {
                    @page {
                        margin: 10mm;
                        size: A4 landscape;
                    }
                    html, body {
                        width: 277mm;
                        overflow: visible;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .page-sheet {
                        page-break-after: always;
                        page-break-inside: avoid;
                        break-after: page;
                        break-inside: avoid;
                    }
                    .page-sheet:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Gilroy', 'Inter', system-ui, -apple-system, sans-serif;
                    color: #000;
                    background: #fff;
                }

                /* --- Page wrapper per component --- */

                .page-sheet {
                    page-break-after: always;
                    page-break-inside: avoid;
                }
                .page-sheet:last-child {
                    page-break-after: auto;
                }

                .compliance-sheet {
                    width: 277mm;
                    height: 190mm;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .compliance-sheet-body {
                    display: flex;
                    flex: 1;
                    min-height: 0;
                    border: 1px solid #000;
                    border-bottom: none;
                    overflow: hidden;
                }

                .footer-meta {
                    font-size: 7px;
                    color: #999;
                    text-align: center;
                    padding: 1mm 2mm;
                    border: 1px solid #000;
                    border-top: 1px solid #ddd;
                    flex-shrink: 0;
                }

                /* Screen-only spacing between sheets */
                @media screen {
                    .page-sheet + .page-sheet {
                        margin-top: 20mm;
                    }
                }

                /* LEFT: Design Authority (60%) */
                .design-authority {
                    width: 60%;
                    padding: 4mm 5mm;
                    border-right: 2px solid #000;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* RIGHT: Production Checklist (40%) */
                .production-checklist {
                    width: 40%;
                    padding: 4mm 5mm;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* --- Shared typography --- */

                .sheet-header {
                    border-bottom: 2px solid #000;
                    padding-bottom: 2mm;
                    margin-bottom: 3mm;
                    flex-shrink: 0;
                }

                .sheet-header h1 {
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    margin: 0;
                    line-height: 1.2;
                }

                .sheet-header h2 {
                    font-size: 9px;
                    font-weight: 400;
                    color: #555;
                    margin: 1px 0 0 0;
                    line-height: 1.2;
                }

                .section-title {
                    font-size: 8px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #000;
                    border-bottom: 1px solid #000;
                    padding-bottom: 1mm;
                    margin-bottom: 2mm;
                    margin-top: 2.5mm;
                    flex-shrink: 0;
                }

                /* --- Artwork thumbnail --- */

                .artwork-thumbnail-container {
                    border: 1px solid #ddd;
                    background: #fafafa;
                    padding: 2mm;
                    margin-bottom: 2mm;
                    text-align: center;
                    height: 55mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .artwork-thumbnail-container img {
                    max-width: 100%;
                    max-height: 51mm;
                    object-fit: contain;
                }

                .artwork-thumbnail-container .no-artwork {
                    color: #999;
                    font-size: 9px;
                    font-style: italic;
                }

                /* --- Spec table --- */

                .spec-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                    margin-bottom: 1mm;
                    flex-shrink: 0;
                }

                .spec-table td {
                    padding: 1mm 1mm;
                    border-bottom: 1px solid #eee;
                    vertical-align: top;
                    line-height: 1.3;
                }

                .spec-table td:first-child {
                    font-weight: 500;
                    color: #555;
                    width: 30%;
                    white-space: nowrap;
                }

                .spec-table td:last-child {
                    font-weight: 600;
                    color: #000;
                }

                /* --- Confirmations --- */

                .confirmation-item {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    font-size: 9px;
                    padding: 0.5mm 0;
                    flex-shrink: 0;
                }

                .checkbox-filled {
                    width: 3mm;
                    height: 3mm;
                    border: 1.5px solid #000;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 7px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                /* --- Empty checkboxes --- */

                .checkbox-empty {
                    width: 3.5mm;
                    height: 3.5mm;
                    border: 1.5px solid #000;
                    display: inline-block;
                    flex-shrink: 0;
                }

                .checkbox-line {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    padding: 1mm 0;
                    font-size: 9px;
                    flex-shrink: 0;
                }

                /* --- Measurement fields --- */

                .measurement-field {
                    border-bottom: 1px dotted #999;
                    width: 25mm;
                    height: 4mm;
                    display: inline-block;
                }

                .measurement-row {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    font-size: 9px;
                    padding: 1mm 0;
                    flex-shrink: 0;
                }

                /* --- Signature blocks --- */

                .signature-block {
                    margin-top: auto;
                    padding-top: 2mm;
                    border-top: 1px solid #ddd;
                    flex-shrink: 0;
                }

                .signature-line {
                    display: flex;
                    align-items: flex-end;
                    gap: 2mm;
                    font-size: 8px;
                    color: #555;
                    padding: 1.5mm 0;
                }

                .signature-line .line {
                    flex: 1;
                    border-bottom: 1px solid #000;
                    min-height: 4mm;
                }

                /* --- Notes area (collapses when space is tight) --- */

                .notes-area {
                    margin-top: 2mm;
                    flex: 1 1 0;
                    min-height: 0;
                    overflow: hidden;
                }

                .notes-area .notes-lines {
                    border-bottom: 1px dotted #ccc;
                    height: 5mm;
                    margin-bottom: 0.5mm;
                }

                /* --- File path --- */

                .file-path {
                    font-family: 'Courier New', monospace;
                    font-size: 7px;
                    word-break: break-all;
                    line-height: 1.2;
                    flex-shrink: 0;
                }

                /* --- Dimension check box --- */

                .dimension-check-section {
                    margin-top: 2mm;
                    padding: 2mm;
                    border: 1px solid #ddd;
                    background: #fafafa;
                    font-size: 8px;
                    flex-shrink: 0;
                }

                .dimension-check-section .title {
                    font-weight: 700;
                    font-size: 7px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #555;
                    margin-bottom: 1mm;
                }

                /* --- Multi-item compact grid (side-by-side) --- */

                .items-grid {
                    display: grid;
                    gap: 1.5mm;
                }
                .items-grid-2 { grid-template-columns: 1fr 1fr; }
                .items-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
                .items-grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

                .item-cell {
                    border: 1px solid #ddd;
                    padding: 1.5mm;
                    font-size: 8px;
                }

                .item-cell-label {
                    font-size: 7px;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 1mm;
                }

                .item-cell .measurement-row {
                    font-size: 8px;
                    padding: 0.5mm 0;
                }

                .item-cell .measurement-field {
                    width: 16mm;
                    height: 3.5mm;
                }

                .dim-check-grid .item-cell {
                    background: #fafafa;
                }

                .dim-check-grid .measurement-row {
                    font-size: 7px;
                    padding: 0.3mm 0;
                }

                .dim-check-grid .measurement-field {
                    width: 12mm;
                    height: 3mm;
                }

                /* --- Design notes (clamped) --- */

                .design-notes {
                    font-size: 8px;
                    color: #333;
                    line-height: 1.3;
                    max-height: 12mm;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                /* ===== COVER SHEET ===== */

                .cover-sheet {
                    width: 277mm;
                    height: 190mm;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid #000;
                    overflow: hidden;
                }

                .cover-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 5mm 10mm 4mm 10mm;
                    border-bottom: 3px solid #000;
                }

                .cover-logo {
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    line-height: 1;
                }

                .cover-logo span {
                    color: #999;
                    font-weight: 400;
                }

                .cover-doc-type {
                    text-align: right;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #555;
                    font-weight: 600;
                }

                .cover-body {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 5mm 10mm;
                }

                .cover-title {
                    font-size: 18px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                    margin-bottom: 0.5mm;
                }

                .cover-subtitle {
                    font-size: 11px;
                    color: #555;
                    margin-bottom: 3mm;
                }

                .cover-meta-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5mm 10mm;
                    font-size: 10px;
                    margin-bottom: 3mm;
                    padding-bottom: 3mm;
                    border-bottom: 1px solid #ddd;
                }

                .cover-meta-label {
                    font-size: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #999;
                    font-weight: 600;
                    margin-bottom: 0.5mm;
                }

                .cover-meta-value {
                    font-size: 11px;
                    font-weight: 600;
                    color: #000;
                }

                .cover-section-title {
                    font-size: 8px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #000;
                    border-bottom: 1px solid #000;
                    padding-bottom: 1.5mm;
                    margin-bottom: 2mm;
                }

                .cover-contents-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                }

                .cover-contents-table th {
                    text-align: left;
                    font-size: 7px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #999;
                    padding: 1mm 2mm;
                    border-bottom: 1px solid #ddd;
                }

                .cover-contents-table td {
                    padding: 1.5mm 2mm;
                    border-bottom: 1px solid #eee;
                    vertical-align: middle;
                }

                .cover-contents-table tr:last-child td {
                    border-bottom: none;
                }

                .cover-check-col {
                    width: 8mm;
                    text-align: center;
                    vertical-align: middle;
                }

                .cover-checkbox {
                    width: 4mm;
                    height: 4mm;
                    border: 1.5px solid #000;
                    display: inline-block;
                }

                .cover-sheet-num {
                    font-weight: 700;
                    color: #000;
                    width: 18mm;
                }

                .cover-comp-name {
                    font-weight: 600;
                    color: #000;
                }

                .cover-comp-type {
                    color: #666;
                }

                .cover-comp-status {
                    font-size: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .cover-status-signed {
                    color: #16a34a;
                }

                .cover-status-prod {
                    color: #2563eb;
                }

                .cover-status-done {
                    color: #059669;
                }

                .cover-status-other {
                    color: #999;
                }

                /* --- 2-column grid layout for 9+ components --- */

                .cover-contents-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0 6mm;
                }

                .cover-contents-grid-col {
                    /* Each column is its own table */
                }

                .cover-contents-grid .cover-contents-table {
                    font-size: 8px;
                }

                .cover-contents-grid .cover-contents-table th {
                    font-size: 6.5px;
                    padding: 0.8mm 1.5mm;
                }

                .cover-contents-grid .cover-contents-table td {
                    padding: 1mm 1.5mm;
                }

                .cover-contents-grid .cover-checkbox {
                    width: 3.5mm;
                    height: 3.5mm;
                }

                .cover-contents-grid .cover-sheet-num {
                    width: 10mm;
                }

                /* --- Summary checkbox --- */

                .cover-summary-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    margin-top: 4mm;
                    font-size: 9px;
                    font-weight: 600;
                }

                .cover-summary-checkbox .cover-checkbox {
                    width: 4.5mm;
                    height: 4.5mm;
                }

                .cover-footer {
                    margin-top: auto;
                    padding: 4mm 10mm;
                    border-top: 1px solid #ddd;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    font-size: 8px;
                    color: #999;
                }

                .cover-summary {
                    display: flex;
                    gap: 8mm;
                    margin-top: 4mm;
                    font-size: 10px;
                }

                .cover-summary-item {
                    text-align: center;
                }

                .cover-summary-num {
                    font-size: 20px;
                    font-weight: 700;
                    color: #000;
                    line-height: 1;
                }

                .cover-summary-label {
                    font-size: 7px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #999;
                    font-weight: 600;
                    margin-top: 1mm;
                }
            `}</style>

            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        if (typeof window !== 'undefined') {
                            Promise.all([
                                document.fonts ? document.fonts.ready : Promise.resolve(),
                                ...Array.from(document.images).map(function(img) {
                                    return img.complete ? Promise.resolve() : new Promise(function(r) { img.onload = r; img.onerror = r; });
                                })
                            ]).then(function() {
                                setTimeout(function() { window.print(); }, 500);
                            });
                        }
                    `,
                }}
            />

            {/* Print hint */}
            <div className="no-print" style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5' }}>
                <p style={{ fontSize: '14px', color: '#666' }}>
                    printing cover + {printableComponents.length} compliance sheet{printableComponents.length !== 1 ? 's' : ''} for {job.job_reference} — print dialog will open automatically
                </p>
            </div>

            {/* COVER SHEET */}
            <div className="page-sheet">
                <div className="cover-sheet">
                    <div className="cover-top">
                        <div className="cover-logo">
                            OneSign <span>& Digital</span>
                        </div>
                        <div className="cover-doc-type">
                            artwork compliance pack
                        </div>
                    </div>

                    <div className="cover-body">
                        <div className="cover-title">{job.job_name}</div>
                        <div className="cover-subtitle">{job.job_reference}</div>

                        <div className="cover-meta-grid">
                            <div>
                                <div className="cover-meta-label">client</div>
                                <div className="cover-meta-value">{job.client_name || '—'}</div>
                            </div>
                            <div>
                                <div className="cover-meta-label">date printed</div>
                                <div className="cover-meta-value">{formatDate(new Date().toISOString())}</div>
                            </div>
                            <div>
                                <div className="cover-meta-label">job status</div>
                                <div className="cover-meta-value">{getJobStatusLabel(job.status as ArtworkJobStatus)}</div>
                            </div>
                            <div>
                                <div className="cover-meta-label">total components</div>
                                <div className="cover-meta-value">{job.components.length} ({printableComponents.length} with signed-off design)</div>
                            </div>
                        </div>

                        {job.description && (
                            <div style={{ fontSize: '9px', color: '#555', marginBottom: '3mm', lineHeight: 1.4 }}>
                                {job.description}
                            </div>
                        )}

                        <div className="cover-section-title">contents</div>
                        {(() => {
                            const useGrid = printableComponents.length > 8;
                            const mid = useGrid ? Math.ceil(printableComponents.length / 2) : printableComponents.length;
                            const leftItems = printableComponents.slice(0, mid);
                            const rightItems = useGrid ? printableComponents.slice(mid) : [];

                            const renderTable = (items: typeof printableComponents, startIndex: number) => (
                                <table className="cover-contents-table">
                                    <thead>
                                        <tr>
                                            <th className="cover-check-col"></th>
                                            <th>sheet</th>
                                            <th>component</th>
                                            <th>type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((component, i) => (
                                            <tr key={component.id}>
                                                <td className="cover-check-col"><span className="cover-checkbox" /></td>
                                                <td className="cover-sheet-num">{startIndex + i + 1}</td>
                                                <td className="cover-comp-name">{component.name}</td>
                                                <td className="cover-comp-type">{getComponentTypeLabel(component.component_type)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            );

                            if (useGrid) {
                                return (
                                    <div className="cover-contents-grid">
                                        <div className="cover-contents-grid-col">
                                            {renderTable(leftItems, 0)}
                                        </div>
                                        <div className="cover-contents-grid-col">
                                            {renderTable(rightItems, mid)}
                                        </div>
                                    </div>
                                );
                            }

                            return renderTable(leftItems, 0);
                        })()}

                        <div className="cover-summary">
                            <div className="cover-summary-item">
                                <div className="cover-summary-num">{printableComponents.length}</div>
                                <div className="cover-summary-label">sheets</div>
                            </div>
                            <div className="cover-summary-item">
                                <div className="cover-summary-num">
                                    {printableComponents.filter(c => c.dimension_flag === 'out_of_tolerance').length}
                                </div>
                                <div className="cover-summary-label">flagged</div>
                            </div>
                        </div>
                        <div className="cover-summary-checkbox">
                            <span className="cover-checkbox" />
                            <span>all components checked and verified</span>
                        </div>
                    </div>

                    <div className="cover-footer">
                        <div>
                            <div>onesign artwork compliance system</div>
                            <div style={{ marginTop: '1mm' }}>this document is for internal quality assurance purposes only</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div>cover — {printableComponents.length} sheet{printableComponents.length !== 1 ? 's' : ''} attached</div>
                            <div style={{ marginTop: '1mm' }}>{job.job_reference}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* One sheet per component */}
            {printableComponents.map((component, index) => {
                const thumbnailUrl = thumbnailUrls[component.id];
                const componentItems = itemsByComponent[component.id] || [];
                const hasItems = componentItems.length > 0;
                // Version count not available from job query — use index-based sheet number
                const sheetNumber = index + 1;

                return (
                    <div key={component.id} className="page-sheet">
                        <div className="compliance-sheet">
                            <div className="compliance-sheet-body">
                            {/* LEFT: Design Authority (60%) */}
                            <div className="design-authority">
                                <div className="sheet-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h1>design authority</h1>
                                            <h2>{job.job_reference} — {component.name}</h2>
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '8px', color: '#555' }}>
                                            <div style={{ fontWeight: 600 }}>{getComponentTypeLabel(component.component_type)}</div>
                                            <div>sheet {sheetNumber} of {printableComponents.length}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Artwork Thumbnail */}
                                <div className="artwork-thumbnail-container">
                                    {thumbnailUrl ? (
                                        <img
                                            src={thumbnailUrl}
                                            alt={`Artwork: ${component.name}`}
                                        />
                                    ) : (
                                        <span className="no-artwork">no artwork thumbnail uploaded</span>
                                    )}
                                </div>

                                {/* Build Specifications */}
                                <div className="section-title">build specifications</div>
                                {hasItems ? (
                                    <table className="spec-table">
                                        <thead>
                                            <tr>
                                                <td></td>
                                                <td style={{ fontWeight: 700, fontSize: '8px', textAlign: 'center' }}>A</td>
                                                {componentItems.map(item => (
                                                    <td key={item.id} style={{ fontWeight: 700, fontSize: '8px', textAlign: 'center' }}>{item.label}</td>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>width</td>
                                                <td style={{ textAlign: 'center' }}>{component.width_mm ? `${component.width_mm} mm` : '—'}</td>
                                                {componentItems.map(item => (
                                                    <td key={item.id} style={{ textAlign: 'center' }}>{item.width_mm ? `${item.width_mm} mm` : '—'}</td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td>height</td>
                                                <td style={{ textAlign: 'center' }}>{component.height_mm ? `${component.height_mm} mm` : '—'}</td>
                                                {componentItems.map(item => (
                                                    <td key={item.id} style={{ textAlign: 'center' }}>{item.height_mm ? `${item.height_mm} mm` : '—'}</td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td>returns</td>
                                                <td style={{ textAlign: 'center' }}>{component.returns_mm ? `${component.returns_mm} mm` : 'n/a'}</td>
                                                {componentItems.map(item => (
                                                    <td key={item.id} style={{ textAlign: 'center' }}>{item.returns_mm ? `${item.returns_mm} mm` : 'n/a'}</td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td>material</td>
                                                <td colSpan={1 + componentItems.length} style={{ textAlign: 'center' }}>{component.material || '—'}</td>
                                            </tr>
                                            {component.lighting && (
                                                <tr>
                                                    <td>lighting</td>
                                                    <td colSpan={1 + componentItems.length} style={{ textAlign: 'center' }}>{getLightingTypeLabel(component.lighting)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="spec-table">
                                        <tbody>
                                            <tr>
                                                <td>width</td>
                                                <td>{component.width_mm ? `${component.width_mm} mm` : '—'}</td>
                                            </tr>
                                            <tr>
                                                <td>height</td>
                                                <td>{component.height_mm ? `${component.height_mm} mm` : '—'}</td>
                                            </tr>
                                            <tr>
                                                <td>returns</td>
                                                <td>{component.returns_mm ? `${component.returns_mm} mm` : 'n/a'}</td>
                                            </tr>
                                            <tr>
                                                <td>material</td>
                                                <td>{component.material || '—'}</td>
                                            </tr>
                                            {component.lighting && (
                                                <tr>
                                                    <td>lighting</td>
                                                    <td>{getLightingTypeLabel(component.lighting)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {/* Confirmations */}
                                <div className="section-title">confirmations</div>
                                <div className="confirmation-item">
                                    <span className="checkbox-filled">{component.scale_confirmed ? '×' : ''}</span>
                                    <span>scale is 1:1 — confirmed</span>
                                </div>
                                <div className="confirmation-item">
                                    <span className="checkbox-filled">{component.bleed_included ? '×' : ''}</span>
                                    <span>bleed included in artwork</span>
                                </div>

                                {/* File Path */}
                                <div className="section-title">file reference</div>
                                <div className="file-path">
                                    {component.file_path || '—'}
                                </div>

                                {/* Notes */}
                                {component.notes && (
                                    <>
                                        <div className="section-title">design notes</div>
                                        <div className="design-notes">{component.notes}</div>
                                    </>
                                )}

                                {/* Signature Block */}
                                <div className="signature-block">
                                    <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: '1mm' }}>
                                        designer sign-off
                                    </div>
                                    <div className="signature-line">
                                        <span>name:</span>
                                        <span className="line" />
                                    </div>
                                    <div className="signature-line">
                                        <span>signature:</span>
                                        <span className="line" />
                                    </div>
                                    <div className="signature-line">
                                        <span>date:</span>
                                        <span className="line" />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Production Checklist (40%) */}
                            <div className="production-checklist">
                                <div className="sheet-header">
                                    <h1>production verification</h1>
                                    <h2>{job.job_name}</h2>
                                </div>

                                {/* Measured Dimensions */}
                                <div className="section-title">measured dimensions</div>
                                {hasItems ? (
                                    <div className={`items-grid items-grid-${Math.min(1 + componentItems.length, 4)}`}>
                                        <div className="item-cell">
                                            <div className="item-cell-label">A</div>
                                            <div className="measurement-row">
                                                <span>w:</span>
                                                <span className="measurement-field" />
                                                <span>mm</span>
                                            </div>
                                            <div className="measurement-row">
                                                <span>h:</span>
                                                <span className="measurement-field" />
                                                <span>mm</span>
                                            </div>
                                        </div>
                                        {componentItems.map(item => (
                                            <div key={item.id} className="item-cell">
                                                <div className="item-cell-label">{item.label}</div>
                                                <div className="measurement-row">
                                                    <span>w:</span>
                                                    <span className="measurement-field" />
                                                    <span>mm</span>
                                                </div>
                                                <div className="measurement-row">
                                                    <span>h:</span>
                                                    <span className="measurement-field" />
                                                    <span>mm</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="measurement-row">
                                            <span>width:</span>
                                            <span className="measurement-field" />
                                            <span>mm</span>
                                        </div>
                                        <div className="measurement-row">
                                            <span>height:</span>
                                            <span className="measurement-field" />
                                            <span>mm</span>
                                        </div>
                                    </>
                                )}

                                {/* Checklist */}
                                <div className="section-title">checklist</div>
                                <div className="checkbox-line">
                                    <span className="checkbox-empty" />
                                    <span>material pulled and confirmed correct</span>
                                </div>
                                <div className="checkbox-line">
                                    <span className="checkbox-empty" />
                                    <span>RIP output checked — no scaling applied</span>
                                </div>
                                <div className="checkbox-line">
                                    <span className="checkbox-empty" />
                                    <span>print quality acceptable</span>
                                </div>
                                <div className="checkbox-line">
                                    <span className="checkbox-empty" />
                                    <span>colour match verified</span>
                                </div>
                                <div className="checkbox-line">
                                    <span className="checkbox-empty" />
                                    <span>finish / lamination correct</span>
                                </div>

                                {/* Dimension Check */}
                                <div className="dimension-check-section">
                                    <div className="title">dimension check (office use)</div>
                                    {hasItems ? (
                                        <div className={`items-grid dim-check-grid items-grid-${Math.min(1 + componentItems.length, 4)}`}>
                                            <div className="item-cell">
                                                <div className="item-cell-label">A</div>
                                                <div className="measurement-row">
                                                    <span>w dev:</span>
                                                    <span className="measurement-field" />
                                                    <span>mm</span>
                                                </div>
                                                <div className="measurement-row">
                                                    <span>h dev:</span>
                                                    <span className="measurement-field" />
                                                    <span>mm</span>
                                                </div>
                                            </div>
                                            {componentItems.map(item => (
                                                <div key={item.id} className="item-cell">
                                                    <div className="item-cell-label">{item.label}</div>
                                                    <div className="measurement-row">
                                                        <span>w dev:</span>
                                                        <span className="measurement-field" />
                                                        <span>mm</span>
                                                    </div>
                                                    <div className="measurement-row">
                                                        <span>h dev:</span>
                                                        <span className="measurement-field" />
                                                        <span>mm</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="measurement-row">
                                                <span>width dev:</span>
                                                <span className="measurement-field" style={{ width: '15mm' }} />
                                                <span>mm</span>
                                            </div>
                                            <div className="measurement-row">
                                                <span>height dev:</span>
                                                <span className="measurement-field" style={{ width: '15mm' }} />
                                                <span>mm</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="checkbox-line" style={{ marginTop: '1mm' }}>
                                        <span className="checkbox-empty" />
                                        <span>within tolerance (+/- {DIMENSION_TOLERANCE_MM}mm)</span>
                                    </div>
                                    <div className="checkbox-line">
                                        <span className="checkbox-empty" />
                                        <span style={{ fontWeight: 600 }}>OUT OF TOLERANCE — escalate</span>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="notes-area">
                                    <div className="section-title">notes</div>
                                    <div className="notes-lines" />
                                    <div className="notes-lines" />
                                    <div className="notes-lines" />
                                </div>

                                {/* Signature Block */}
                                <div className="signature-block">
                                    <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: '1mm' }}>
                                        production sign-off
                                    </div>
                                    <div className="signature-line">
                                        <span>name:</span>
                                        <span className="line" />
                                    </div>
                                    <div className="signature-line">
                                        <span>signature:</span>
                                        <span className="line" />
                                    </div>
                                    <div className="signature-line">
                                        <span>date:</span>
                                        <span className="line" />
                                    </div>
                                </div>
                            </div>
                            </div>

                            {/* Footer — inside the sheet so it doesn't spill to a second page */}
                            <div className="footer-meta">
                                {job.job_reference} — {component.name} — sheet {sheetNumber}/{printableComponents.length} — printed {formatDate(new Date().toISOString())} — onesign artwork compliance system
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
